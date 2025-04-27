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
                
                if (tab.dataset.tab === 'topology') {
                    this.updateTopologyGraph();
                    this.updateDeviceList();
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
    
    updateTopologyGraph() {
        const canvas = document.getElementById('topology-graph');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw server
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 50, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Server', canvas.width / 2, 55);
        
        // Draw room devices
        const numRooms = Object.keys(ROOMS_CONFIG).length;
        Object.entries(ROOMS_CONFIG).forEach(([id, room], index) => {
            const angle = (Math.PI * 2 * index) / numRooms;
            const x = canvas.width / 2 + Math.cos(angle) * 120;
            const y = 150 + Math.sin(angle) * 80;
            
            // Draw connection line
            ctx.strokeStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 80);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw device
            ctx.fillStyle = room.color;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Device label
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(room.name, x, y + 30);
            ctx.fillText(room.ip, x, y + 45);
        });
    }
    
    updateDeviceList() {
        const deviceList = document.getElementById('device-list');
        let html = '';
        this.stats.deviceRegistry.forEach((device, ip) => {
            html += `
                <div style="margin: 10px 0; padding: 10px; background: #333; border-radius: 5px;">
                    <div><strong>${device.name}</strong></div>
                    <div>IP: ${ip} | MAC: ${device.mac}</div>
                    <div>Type: ${device.type}</div>
                </div>
            `;
        });
        deviceList.innerHTML = html;
    }
}