// network-monitor-iot.js
import { NETWORK_CONFIG, ROOMS_CONFIG } from './utils/constants.js';
import { formatBytes } from './utils/helpers.js';

export class NetworkMonitor {
    constructor() {
        this.stats = {
            totalPackets: 0,
            activeConnections: new Set(),
            bandwidth: 0,
            packetLoss: 0,
            trafficHistory: [],
            deviceRegistry: new Map()
        };
        
        // Separate message limits for different types
        this.messageLimits = {
            tcp: 100,      // TCP messages
            app: 50,       // Application layer messages
            iot: 100,      // IoT protocol messages
            controller: 50, // Controller messages
            device: 50,    // Device messages
            physical: 30,  // Physical layer messages
            dataLink: 30,  // Data Link layer messages  
            network: 30,   // Network layer messages
            transport: 30, // Transport layer messages
            session: 30,   // Session layer messages
            presentation: 30 // Presentation layer messages
        };
        
        // Track message counts per type
        this.messageCounts = {
            tcp: 0,
            app: 0,
            iot: 0,
            controller: 0,
            device: 0,
            physical: 0,
            dataLink: 0,
            network: 0,
            transport: 0,
            session: 0,
            presentation: 0
        };
        
        // Track current filter state
        this.currentFilters = {
            packets: 'all',
            'controller-msgs': 'all',
            'device-msgs': 'all'
        };
        
        // Initialize protocol timelines for IoT tab
        this.protocolTimelines = {
            mqtt: [],
            coap: [],
            zigbee: [],
            zwave: []
        };
        
        this.initializeDeviceRegistry();
        this.setupEventListeners();
    }
    
    initializeDeviceRegistry() {
        this.stats.deviceRegistry.set(NETWORK_CONFIG.serverIP, {
            name: 'Central Server',
            type: 'Server',
            mac: NETWORK_CONFIG.macAddresses.server
        });
        
        const deviceNames = {
            livingRoom: 'Living Room Controller',
            kitchen: 'Kitchen Controller',
            bedroom: 'Bedroom Controller',
            bathroom: 'Bathroom Controller'
        };
        
        Object.entries(NETWORK_CONFIG.deviceIPs).forEach(([key, ip]) => {
            this.stats.deviceRegistry.set(ip, {
                name: deviceNames[key],
                type: 'IoT',
                mac: NETWORK_CONFIG.macAddresses[key]
            });
        });
    }
    
    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeEventListeners());
        } else {
            this.initializeEventListeners();
        }
    }
    
    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.monitor-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.monitor-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const activeTab = document.getElementById(tab.dataset.tab);
                activeTab.classList.add('active');
                
                // Reapply active filter when switching tabs
                const activeFilter = activeTab.querySelector('.filter-btn.active');
                if (activeFilter) {
                    activeFilter.click();
                }
                
                if (tab.dataset.tab === 'iot') {
                    this.updateIoTDisplay();
                }
            });
        });
        
        // Filter buttons for all tabs
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.parentElement;
                parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                const tabContent = btn.closest('.tab-content');
                
                // Update current filter state
                this.currentFilters[tabContent.id] = filter;
                
                // Apply filter to appropriate entries
                this.applyFilter(tabContent.id, filter);
            });
        });
    }
    
    applyFilter(tabId, filter) {
        const tabContent = document.getElementById(tabId);
        if (!tabContent) return;
        
        let entries;
        
        // Select appropriate entries based on which tab is active
        if (tabId === 'packets') {
            entries = tabContent.querySelectorAll('.packet-entry');
        } else if (tabId === 'controller-msgs') {
            entries = tabContent.querySelectorAll('.controller-msg');
        } else if (tabId === 'device-msgs') {
            entries = tabContent.querySelectorAll('.device-msg');
        }
        
        if (entries) {
            entries.forEach(entry => {
                if (filter === 'all' || entry.classList.contains(filter)) {
                    entry.style.display = 'block';
                } else {
                    entry.style.display = 'none';
                }
            });
        }
    }
    
    logPacket(packet, type = 'tcp') {
        const log = document.getElementById('packet-log');
        if (!log) return;
        
        const entry = document.createElement('div');
        entry.className = `packet-entry ${type}`;
        
        const time = new Date().toLocaleTimeString();
        
        if (type === 'tcp') {
            // Log in the TCP/IP packet monitor
            entry.innerHTML = `
                <div class="packet-header">TCP Segment - ${time}</div>
                <div>Source: ${packet.src} → Destination: ${packet.dst}</div>
                <div>Seq: ${packet.seq} Ack: ${packet.ack} Window: ${packet.window}</div>
                <div class="tcp-flags">
                    ${packet.flags.map(flag => `<span class="tcp-flag ${flag.active ? 'active' : ''}">${flag.name}</span>`).join('')}
                </div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
            
            // Also log in the transport layer
            this.logTransportLayerPacket('TCP', packet.src, packet.dst, packet.seq, packet.ack, packet.flags, packet.data);
        } else if (type === 'app') {
            entry.innerHTML = `
                <div class="packet-header">Application Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'iot') {
            entry.innerHTML = `
                <div class="packet-header iot-${packet.protocol.toLowerCase()}">${packet.protocol} Message - ${time}</div>
                <div>Source: ${packet.src} → Destination: ${packet.dst}</div>
                <div>Type: ${packet.messageType}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'physical') {
            entry.innerHTML = `
                <div class="packet-header layer-physical">Physical Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'dataLink') {
            entry.innerHTML = `
                <div class="packet-header layer-datalink">Data Link Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div>Source MAC: ${packet.data.sourceMAC} → Destination MAC: ${packet.data.destinationMAC}</div>
                <div class="packet-data">Frame Type: ${packet.data.frameType}</div>
            `;
        } else if (type === 'network') {
            entry.innerHTML = `
                <div class="packet-header layer-network">Network Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'transport') {
            entry.innerHTML = `
                <div class="packet-header layer-transport">Transport Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div>Source Port: ${packet.data.sourcePort} → Destination Port: ${packet.data.destinationPort}</div>
                <div class="packet-data">Additional Info: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'session') {
            entry.innerHTML = `
                <div class="packet-header layer-session">Session Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        } else if (type === 'presentation') {
            entry.innerHTML = `
                <div class="packet-header layer-presentation">Presentation Layer - ${time}</div>
                <div>Protocol: ${packet.protocol}</div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
        }
        
        // Apply current filter to new entry
        const currentFilter = this.currentFilters.packets;
        if (currentFilter !== 'all' && !entry.classList.contains(currentFilter)) {
            entry.style.display = 'none';
        }
        
        log.insertBefore(entry, log.firstChild);
        
        // Enforce type-specific message limits
        this.messageCounts[type] = (this.messageCounts[type] || 0) + 1;
        if (this.messageCounts[type] > this.messageLimits[type]) {
            // Find and remove the oldest message of this type
            const oldestOfType = Array.from(log.children)
                .reverse()
                .find(child => child.classList.contains(type));
            
            if (oldestOfType) {
                log.removeChild(oldestOfType);
                this.messageCounts[type]--;
            }
        }
        
        // Update statistics
        this.stats.totalPackets++;
        this.stats.bandwidth += JSON.stringify(packet).length;
        this.updateStatsDisplay();
    }
    
    // New method to log TCP packets in the transport layer
    logTransportLayerPacket(protocol, src, dst, seq, ack, flags, data) {
        // Extract source and destination ports from the src and dst strings
        const srcParts = src.split(':');
        const dstParts = dst.split(':');
        const sourcePort = srcParts.length > 1 ? srcParts[1] : '0';
        const destinationPort = dstParts.length > 1 ? dstParts[1] : '0';
        const sourceIP = srcParts[0];
        const destinationIP = dstParts[0];
        
        // Create transport layer packet
        this.logPacket({
            protocol: protocol,
            data: {
                sourceIP: sourceIP,
                destinationIP: destinationIP,
                sourcePort: sourcePort,
                destinationPort: destinationPort,
                seq: seq,
                ack: ack,
                flags: flags.filter(f => f.active).map(f => f.name),
                payload: data
            }
        }, 'transport');
    }
    
    // Controller messages
    logControllerMessage(message) {
        const log = document.getElementById('controller-log');
        if (!log) return;
        
        const entry = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        
        entry.className = `controller-msg ${message.type}`;
        entry.innerHTML = `
            <div class="msg-header">
                ${message.from} → ${message.to}
                <span class="msg-timestamp">${time}</span>
            </div>
            <div class="msg-content">
                <div>Type: ${message.type}</div>
                <div>Action: ${message.action}</div>
                <div class="packet-data">Data: ${JSON.stringify(message.data)}</div>
            </div>
        `;
        
        // Apply current filter to new entry
        const currentFilter = this.currentFilters['controller-msgs'];
        if (currentFilter !== 'all' && !entry.classList.contains(currentFilter)) {
            entry.style.display = 'none';
        }
        
        log.insertBefore(entry, log.firstChild);
        
        // Enforce controller message limit
        this.messageCounts.controller++;
        if (this.messageCounts.controller > this.messageLimits.controller) {
            log.removeChild(log.lastChild);
            this.messageCounts.controller--;
        }
    }
    
    // Device messages
    logDeviceMessage(message) {
        const log = document.getElementById('device-log');
        if (!log) return;
        
        const entry = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        
        entry.className = `device-msg ${message.deviceType}`;
        entry.innerHTML = `
            <div class="msg-header">
                <span class="device-identifier">${message.deviceId}</span>
                <span class="msg-timestamp">${time}</span>
            </div>
            <div class="msg-content">
                <div>Type: ${message.deviceType}</div>
                <div>Event: ${message.event}</div>
                <div class="packet-data">Data: ${JSON.stringify(message.data)}</div>
            </div>
        `;
        
        // Apply current filter to new entry
        const currentFilter = this.currentFilters['device-msgs'];
        if (currentFilter !== 'all' && !entry.classList.contains(currentFilter)) {
            entry.style.display = 'none';
        }
        
        log.insertBefore(entry, log.firstChild);
        
        // Enforce device message limit
        this.messageCounts.device++;
        if (this.messageCounts.device > this.messageLimits.device) {
            log.removeChild(log.lastChild);
            this.messageCounts.device--;
        }
    }
    
    updateStatsDisplay() {
        const totalPacketsEl = document.getElementById('total-packets');
        const activeConnectionsEl = document.getElementById('active-connections');
        const bandwidthEl = document.getElementById('bandwidth');
        const packetLossEl = document.getElementById('packet-loss');
        
        if (totalPacketsEl) totalPacketsEl.textContent = this.stats.totalPackets;
        if (activeConnectionsEl) activeConnectionsEl.textContent = this.stats.activeConnections.size;
        if (bandwidthEl) bandwidthEl.textContent = formatBytes(this.stats.bandwidth);
        if (packetLossEl) packetLossEl.textContent = this.stats.packetLoss + '%';
    }
    
    // Update IoT statistics
    updateIoTStats(iotStats) {
        // Update MQTT stats
        const mqttMessagesEl = document.getElementById('mqtt-messages');
        const mqttTopicsEl = document.getElementById('mqtt-topics');
        const mqttQosEl = document.getElementById('mqtt-qos');
        
        if (mqttMessagesEl) mqttMessagesEl.textContent = iotStats.mqtt.messages;
        if (mqttTopicsEl) mqttTopicsEl.textContent = Object.keys(iotStats.mqtt.topics).length;
        if (mqttQosEl) mqttQosEl.textContent = iotStats.mqtt.qos || 0;
        
        // Update CoAP stats
        const coapRequestsEl = document.getElementById('coap-requests');
        const coapObservesEl = document.getElementById('coap-observes');
        const coapErrorsEl = document.getElementById('coap-errors');
        
        if (coapRequestsEl) coapRequestsEl.textContent = iotStats.coap.requests;
        if (coapObservesEl) coapObservesEl.textContent = iotStats.coap.observes;
        if (coapErrorsEl) coapErrorsEl.textContent = iotStats.coap.errors;
        
        // Update ZigBee stats
        const zigbeeDevicesEl = document.getElementById('zigbee-devices');
        const zigbeeMessagesEl = document.getElementById('zigbee-messages');
        const zigbeeRoutesEl = document.getElementById('zigbee-routes');
        
        if (zigbeeDevicesEl) zigbeeDevicesEl.textContent = iotStats.zigbee.devices;
        if (zigbeeMessagesEl) zigbeeMessagesEl.textContent = iotStats.zigbee.messages;
        if (zigbeeRoutesEl) zigbeeRoutesEl.textContent = iotStats.zigbee.routes;
        
        // Update Z-Wave stats
        const zwaveDevicesEl = document.getElementById('zwave-devices');
        const zwaveMessagesEl = document.getElementById('zwave-messages');
        const zwaveHopsEl = document.getElementById('zwave-hops');
        
        if (zwaveDevicesEl) zwaveDevicesEl.textContent = iotStats.zwave.devices;
        if (zwaveMessagesEl) zwaveMessagesEl.textContent = iotStats.zwave.messages;
        if (zwaveHopsEl) zwaveHopsEl.textContent = iotStats.zwave.hops;
        
        // Update active topics
        this.updateActiveTopics(iotStats);
        
        // Update timeline
        this.updateIoTTimeline(iotStats);
    }
    
    updateActiveTopics(iotStats) {
        const topicsDiv = document.getElementById('iot-active-topics');
        if (!topicsDiv) return;
        
        let html = '';
        
        // MQTT topics
        Object.entries(iotStats.mqtt.topics).forEach(([topic, count]) => {
            html += `
                <div class="topic-item">
                    <span class="topic-name">MQTT: ${topic}</span>
                    <span class="topic-count">${count}</span>
                </div>
            `;
        });
        
        // CoAP resources (simulated)
        const coapResources = ['/sensors', '/actuators', '/status'];
        coapResources.forEach(resource => {
            const count = Math.floor(Math.random() * 10) + 1;
            html += `
                <div class="topic-item">
                    <span class="topic-name">CoAP: ${resource}</span>
                    <span class="topic-count">${count}</span>
                </div>
            `;
        });
        
        topicsDiv.innerHTML = html || '<div style="text-align: center; color: #888;">No active topics</div>';
    }
    
    updateIoTTimeline(iotStats) {
        const canvas = document.getElementById('iot-timeline');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        
        ctx.clearRect(0, 0, width, height);
        
        // Add current data points
        const now = Date.now();
        this.protocolTimelines.mqtt.push({ time: now, value: iotStats.mqtt.messages });
        this.protocolTimelines.coap.push({ time: now, value: iotStats.coap.requests });
        this.protocolTimelines.zigbee.push({ time: now, value: iotStats.zigbee.messages });
        this.protocolTimelines.zwave.push({ time: now, value: iotStats.zwave.messages });
        
        // Keep only last 60 seconds of data
        const timeWindow = 60000;
        Object.keys(this.protocolTimelines).forEach(protocol => {
            this.protocolTimelines[protocol] = this.protocolTimelines[protocol].filter(
                point => now - point.time < timeWindow
            );
        });
        
        // Draw grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        
        // Time grid
        const timeSteps = 6;
        for (let i = 0; i <= timeSteps; i++) {
            const x = (width / timeSteps) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            // Time labels
            const timeLabel = Math.floor((timeSteps - i) * 10);
            ctx.fillStyle = '#888';
            ctx.font = '10px Arial';
            ctx.fillText(`${timeLabel}s`, x + 5, height - 5);
        }
        
        // Protocol rows
        const protocols = [
            { name: 'MQTT', color: '#00B4D8', data: this.protocolTimelines.mqtt },
            { name: 'CoAP', color: '#4CC9F0', data: this.protocolTimelines.coap },
            { name: 'ZigBee', color: '#7209B7', data: this.protocolTimelines.zigbee },
            { name: 'Z-Wave', color: '#F72585', data: this.protocolTimelines.zwave }
        ];
        
        const rowHeight = height / protocols.length;
        
        // Draw protocol timelines
        protocols.forEach((protocol, index) => {
            const y = rowHeight * (index + 0.5);
            
            // Protocol label with background
            ctx.fillStyle = '#333';
            ctx.fillRect(0, y - 10, 50, 20);
            ctx.fillStyle = protocol.color;
            ctx.font = '12px Arial';
            ctx.fillText(protocol.name, 5, y + 5);
            
            // Activity line
            ctx.strokeStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(60, y);
            ctx.lineTo(width - 10, y);
            ctx.stroke();
            
            // Plot activity markers
            if (protocol.data.length > 0) {
                ctx.fillStyle = protocol.color;
                protocol.data.forEach(point => {
                    const x = ((now - point.time) / timeWindow) * (width - 70);
                    const markerX = width - 10 - x;
                    
                    if (markerX >= 60) {
                        ctx.beginPath();
                        ctx.arc(markerX, y, 4, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Activity bar
                        ctx.fillRect(markerX - 1, y - 10, 2, 20);
                    }
                });
            }
        });
    }
    
    updateTrafficHistory(bytes) {
        this.stats.trafficHistory.push({ 
            time: new Date().getTime(), 
            bytes: bytes 
        });
        this.updateTrafficGraph();
    }
    
    updateTrafficGraph() {
        const canvas = document.getElementById('traffic-graph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (canvas.height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw traffic data
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const now = new Date().getTime();
        const points = this.stats.trafficHistory.filter(p => now - p.time < 60000);
        
        if (points.length > 0) {
            points.forEach((point, i) => {
                const x = (1 - (now - point.time) / 60000) * canvas.width;
                const y = canvas.height - (point.bytes / 1000) * canvas.height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
    }
    
    updateIoTDisplay() {
        // Method to update the IoT display when tab is activated
        // This can be extended with additional functionality if needed
    }
}