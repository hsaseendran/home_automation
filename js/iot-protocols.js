// iot-protocols.js
import { NETWORK_CONFIG } from './utils/constants.js';

export class IoTProtocols {
    constructor(networkMonitor, roomManager) {
        this.networkMonitor = networkMonitor;
        this.roomManager = roomManager;
        
        // Protocol configurations
        this.protocols = {
            mqtt: {
                name: 'MQTT',
                color: 0x00B4D8,
                port: 1883,
                qos: [0, 1, 2],
                topics: {
                    sensors: '/home/sensors',
                    actuators: '/home/actuators',
                    status: '/home/status',
                    telemetry: '/home/telemetry'
                }
            },
            coap: {
                name: 'CoAP',
                color: 0x4CC9F0,
                port: 5683,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OBSERVE'],
                messageTypes: ['CON', 'NON', 'ACK', 'RST']
            },
            zigbee: {
                name: 'ZigBee',
                color: 0x7209B7,
                channel: 11,
                panId: '0x1A62',
                profiles: ['Home Automation', 'Light Link', 'Smart Energy']
            },
            zwave: {
                name: 'Z-Wave',
                color: 0xF72585,
                frequency: '908.42MHz',
                homeId: '0x3E8',
                nodeTypes: ['Controller', 'Slave', 'Routing Slave']
            }
        };
        
        // Initialize protocol statistics
        this.stats = {
            mqtt: { messages: 0, errors: 0, subscriptions: new Set(), topics: {} },
            coap: { requests: 0, responses: 0, observes: 0, errors: 0 },
            zigbee: { devices: 0, messages: 0, routes: 0, errors: 0 },
            zwave: { devices: 0, messages: 0, hops: 0, errors: 0 }
        };
    }
    
    // MQTT Simulation
    simulateMQTT(roomId, type, data) {
        const room = this.roomManager.rooms[roomId];
        const broker = { ip: NETWORK_CONFIG.serverIP, port: this.protocols.mqtt.port };
        const client = { ip: room.ip, port: Math.floor(Math.random() * 1000 + 49152) };
        
        // Connect to broker
        this.networkMonitor.logPacket({
            src: client.ip + ':' + client.port,
            dst: broker.ip + ':' + broker.port,
            protocol: 'MQTT',
            messageType: 'CONNECT',
            data: { clientId: `${room.name}_client`, cleanSession: true }
        }, 'iot');
        
        // CONNACK response
        setTimeout(() => {
            this.networkMonitor.logPacket({
                src: broker.ip + ':' + broker.port,
                dst: client.ip + ':' + client.port,
                protocol: 'MQTT',
                messageType: 'CONNACK',
                data: { returnCode: 0, sessionPresent: false }
            }, 'iot');
            
            // Publish message
            const topic = this.protocols.mqtt.topics[type];
            const qos = Math.floor(Math.random() * 3);
            
            this.networkMonitor.logPacket({
                src: client.ip + ':' + client.port,
                dst: broker.ip + ':' + broker.port,
                protocol: 'MQTT',
                messageType: 'PUBLISH',
                data: { topic, qos, retain: false, payload: data }
            }, 'iot');
            
            // Update stats
            this.stats.mqtt.messages++;
            this.stats.mqtt.topics[topic] = (this.stats.mqtt.topics[topic] || 0) + 1;
            this.networkMonitor.updateIoTStats(this.stats);
            
            // QoS handling
            if (qos > 0) {
                setTimeout(() => {
                    this.networkMonitor.logPacket({
                        src: broker.ip + ':' + broker.port,
                        dst: client.ip + ':' + client.port,
                        protocol: 'MQTT',
                        messageType: qos === 1 ? 'PUBACK' : 'PUBREC',
                        data: { messageId: Math.floor(Math.random() * 65535) }
                    }, 'iot');
                }, 200);
            }
        }, 500);
    }
    
    // CoAP Simulation
    simulateCoAP(roomId, method, resource, payload = null) {
        const room = this.roomManager.rooms[roomId];
        const server = { ip: NETWORK_CONFIG.serverIP, port: this.protocols.coap.port };
        const client = { ip: room.ip, port: Math.floor(Math.random() * 1000 + 49152) };
        
        const messageId = Math.floor(Math.random() * 65535);
        const token = Math.floor(Math.random() * 16777215);
        
        // Request
        this.networkMonitor.logPacket({
            src: client.ip + ':' + client.port,
            dst: server.ip + ':' + server.port,
            protocol: 'CoAP',
            messageType: 'CON',
            data: { 
                method, 
                path: resource, 
                messageId, 
                token, 
                payload,
                options: [
                    { number: 11, value: 'device' },
                    { number: 12, value: '60' }
                ]
            }
        }, 'iot');
        
        // Response
        setTimeout(() => {
            const responseCode = method === 'GET' ? '2.05' : '2.01';
            this.networkMonitor.logPacket({
                src: server.ip + ':' + server.port,
                dst: client.ip + ':' + client.port,
                protocol: 'CoAP',
                messageType: 'ACK',
                data: { 
                    code: responseCode, 
                    messageId, 
                    token,
                    payload: method === 'GET' ? { value: Math.random() * 100 } : null
                }
            }, 'iot');
            
            // Update stats
            this.stats.coap.requests++;
            this.stats.coap.responses++;
            this.networkMonitor.updateIoTStats(this.stats);
        }, 300);
    }
    
    // ZigBee Simulation
    simulateZigBee(roomId, messageType, data) {
        const room = this.roomManager.rooms[roomId];
        const coordinator = { address: '0x0000', endpoint: 1 };
        const device = { 
            address: this.getZigBeeAddress(roomId),
            endpoint: 1,
            profile: 'Home Automation'
        };
        
        // Device announcement
        if (messageType === 'join') {
            this.networkMonitor.logPacket({
                src: device.address,
                dst: 'broadcast',
                protocol: 'ZigBee',
                messageType: 'Device Announce',
                data: { 
                    shortAddress: device.address,
                    macAddress: NETWORK_CONFIG.macAddresses[roomId.replace('-room', '')],
                    capabilities: ['Router', 'Mains-powered']
                }
            }, 'iot');
            
            this.stats.zigbee.devices++;
        }
        
        // Regular message
        this.networkMonitor.logPacket({
            src: device.address,
            dst: coordinator.address,
            protocol: 'ZigBee',
            messageType: messageType,
            data: {
                clusterId: this.getZigBeeCluster(messageType),
                profileId: '0x0104', // Home Automation Profile
                payload: data
            }
        }, 'iot');
        
        // Update stats
        this.stats.zigbee.messages++;
        this.networkMonitor.updateIoTStats(this.stats);
    }
    
    // Z-Wave Simulation
    simulateZWave(roomId, commandClass, command, data = null) {
        const room = this.roomManager.rooms[roomId];
        const controller = { nodeId: 1 };
        const device = { nodeId: this.getZWaveNodeId(roomId) };
        
        // Command frame
        this.networkMonitor.logPacket({
            src: controller.nodeId,
            dst: device.nodeId,
            protocol: 'Z-Wave',
            messageType: 'Command',
            data: {
                commandClass,
                command,
                payload: data,
                homeId: this.protocols.zwave.homeId,
                security: 'S2'
            }
        }, 'iot');
        
        // Acknowledgment
        setTimeout(() => {
            this.networkMonitor.logPacket({
                src: device.nodeId,
                dst: controller.nodeId,
                protocol: 'Z-Wave',
                messageType: 'ACK',
                data: {
                    status: 'success',
                    rssi: -65 + Math.random() * 20
                }
            }, 'iot');
            
            // Update stats
            this.stats.zwave.messages++;
            this.networkMonitor.updateIoTStats(this.stats);
        }, 100);
    }
    
    // Helper functions
    getZigBeeAddress(roomId) {
        const addresses = {
            'living-room': '0x7865',
            'kitchen': '0x7866',
            'bedroom': '0x7867',
            'bathroom': '0x7868'
        };
        return addresses[roomId] || '0x7869';
    }
    
    getZWaveNodeId(roomId) {
        const nodeIds = {
            'living-room': 2,
            'kitchen': 3,
            'bedroom': 4,
            'bathroom': 5
        };
        return nodeIds[roomId] || 6;
    }
    
    getZigBeeCluster(messageType) {
        const clusters = {
            'temperature': '0x0402',
            'occupancy': '0x0406',
            'light': '0x0006',
            'power': '0x0702'
        };
        return clusters[messageType] || '0x0000';
    }
    
    // Simulate periodic sensor updates
    startPeriodicUpdates() {
        // MQTT telemetry every 30 seconds
        setInterval(() => {
            Object.keys(this.roomManager.rooms).forEach(roomId => {
                const room = this.roomManager.rooms[roomId];
                this.simulateMQTT(roomId, 'telemetry', {
                    temperature: room.temp,
                    humidity: 40 + Math.random() * 20,
                    timestamp: new Date().toISOString()
                });
            });
        }, 30000);
        
        // CoAP observe every minute
        setInterval(() => {
            Object.keys(this.roomManager.rooms).forEach(roomId => {
                this.simulateCoAP(roomId, 'OBSERVE', `/rooms/${roomId}/status`);
            });
        }, 60000);
    }
    
    // Visualize protocol activity
    visualizeProtocolTraffic(protocol, intensity = 1) {
        const protocolConfig = this.protocols[protocol];
        const material = new THREE.LineBasicMaterial({ 
            color: protocolConfig.color,
            opacity: intensity,
            transparent: true
        });
        
        // Create visual representation (implement as needed)
        return material;
    }
}