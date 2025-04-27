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
        // Tab switching
        document.querySelectorAll('.monitor-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.monitor-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
                
                if (tab.dataset.tab === 'iot') {
                    this.updateIoTDisplay();
                }
            });
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                document.querySelectorAll('.packet-entry').forEach(entry => {
                    if (filter === 'all' || entry.classList.contains(filter)) {
                        entry.style.display = 'block';
                    } else {
                        entry.style.display = 'none';
                    }
                });
            });
        });
    }
    
    logPacket(packet, type = 'tcp') {
        const log = document.getElementById('packet-log');
        const entry = document.createElement('div');
        entry.className = `packet-entry ${type}`;
        
        const time = new Date().toLocaleTimeString();
        
        if (type === 'tcp') {
            entry.innerHTML = `
                <div class="packet-header">TCP Segment - ${time}</div>
                <div>Source: ${packet.src} → Destination: ${packet.dst}</div>
                <div>Seq: ${packet.seq} Ack: ${packet.ack} Window: ${packet.window}</div>
                <div class="tcp-flags">
                    ${packet.flags.map(flag => `<span class="tcp-flag ${flag.active ? 'active' : ''}">${flag.name}</span>`).join('')}
                </div>
                <div class="packet-data">Data: ${JSON.stringify(packet.data)}</div>
            `;
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
        }
        
        log.insertBefore(entry, log.firstChild);
        if (log.children.length > 100) {
            log.removeChild(log.lastChild);
        }
        
        // Update statistics
        this.stats.totalPackets++;
        this.stats.bandwidth += JSON.stringify(packet).length;
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        document.getElementById('total-packets').textContent = this.stats.totalPackets;
        document.getElementById('active-connections').textContent = this.stats.activeConnections.size;
        document.getElementById('bandwidth').textContent = formatBytes(this.stats.bandwidth);
        document.getElementById('packet-loss').textContent = this.stats.packetLoss + '%';
    }
    
    updateIoTStats(iotStats) {
        // Update MQTT stats
        document.getElementById('mqtt-messages').textContent = iotStats.mqtt.messages;
        document.getElementById('mqtt-topics').textContent = Object.keys(iotStats.mqtt.topics).length;
        document.getElementById('mqtt-qos').textContent = iotStats.mqtt.qos || 0;
        
        // Update CoAP stats
        document.getElementById('coap-requests').textContent = iotStats.coap.requests;
        document.getElementById('coap-observes').textContent = iotStats.coap.observes;
        document.getElementById('coap-errors').textContent = iotStats.coap.errors;
        
        // Update ZigBee stats
        document.getElementById('zigbee-devices').textContent = iotStats.zigbee.devices;
        document.getElementById('zigbee-messages').textContent = iotStats.zigbee.messages;
        document.getElementById('zigbee-routes').textContent = iotStats.zigbee.routes;
        
        // Update Z-Wave stats
        document.getElementById('zwave-devices').textContent = iotStats.zwave.devices;
        document.getElementById('zwave-messages').textContent = iotStats.zwave.messages;
        document.getElementById('zwave-hops').textContent = iotStats.zwave.hops;
        
        // Update active topics
        this.updateActiveTopics(iotStats);
        
        // Update timeline
        this.updateIoTTimeline(iotStats);
    }
    
    updateActiveTopics(iotStats) {
        const topicsDiv = document.getElementById('iot-active-topics');
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
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw timeline grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = (canvas.height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Protocol lines
        const protocols = [
            { name: 'MQTT', color: '#00B4D8', data: [] },
            { name: 'CoAP', color: '#4CC9F0', data: [] },
            { name: 'ZigBee', color: '#7209B7', data: [] },
            { name: 'Z-Wave', color: '#F72585', data: [] }
        ];
        
        const now = Date.now();
        const timespan = 60000; // 1 minute
        
        // Draw protocol activity
        protocols.forEach((protocol, index) => {
            const y = (canvas.height / 4) * (index + 0.5);
            
            // Protocol label
            ctx.fillStyle = protocol.color;
            ctx.font = '12px Arial';
            ctx.fillText(protocol.name, 10, y + 5);
            
            // Activity lines
            ctx.strokeStyle = protocol.color;
            ctx.beginPath();
            ctx.moveTo(60, y);
            ctx.lineTo(canvas.width - 10, y);
            ctx.stroke();
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
}