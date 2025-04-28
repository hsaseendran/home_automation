// tcp-simulator.js
import { NETWORK_CONFIG } from './utils/constants.js';

export class TCPSimulator {
    constructor(networkMonitor, roomManager) {
        this.networkMonitor = networkMonitor;
        this.roomManager = roomManager;
        this.roomControllers = null;
        this.networkLayers = null;
        this.tcpSessions = {};
    }
    
    setRoomControllers(controllers) {
        this.roomControllers = controllers;
    }
    
    setNetworkLayers(networkLayers) {
        this.networkLayers = networkLayers;
    }
    
    createSessionKey(fromDevice, toDevice) {
        return `${fromDevice.ip}:${fromDevice.port}-${toDevice.ip}:${toDevice.port}`;
    }
    
    initSession(sessionKey) {
        if (!this.tcpSessions[sessionKey]) {
            this.tcpSessions[sessionKey] = {
                state: 'CLOSED',
                seq: Math.floor(Math.random() * 1000),
                ack: 0
            };
        }
        return this.tcpSessions[sessionKey];
    }
    
    simulateFullConnection(roomId, peopleCount) {
        const room = this.roomManager.rooms[roomId];
        const server = { ip: NETWORK_CONFIG.serverIP, port: NETWORK_CONFIG.serverPort };
        const client = { ip: room.ip, port: '5000' };
        
        const sessionKey = this.createSessionKey(client, server);
        const session = this.initSession(sessionKey);
        
        // Start with full network stack communication
        if (this.networkLayers) {
            this.networkLayers.simulateFullStackCommunication(client.ip, server.ip, {
                type: 'tcp_connection',
                source: client,
                destination: server
            });
        }
        
        // Then proceed with TCP handshake
        setTimeout(() => {
            this.simulateThreeWayHandshake(client, server, session, sessionKey);
        }, 500);
        
        // Data transfer
        setTimeout(() => {
            this.simulateDataTransfer(client, server, session, roomId, peopleCount);
        }, 2000);
        
        // Connection termination
        setTimeout(() => {
            this.simulateConnectionTermination(client, server, session, sessionKey);
        }, 3500);
        
        this.roomManager.animateConnection(roomId, 6000);
    }
    
    simulateThreeWayHandshake(client, server, session, sessionKey) {
        // 1. Client sends SYN
        this.networkMonitor.logPacket({
            src: client.ip + ':' + client.port,
            dst: server.ip + ':' + server.port,
            seq: session.seq,
            ack: 0,
            window: 65535,
            flags: [
                { name: 'SYN', active: true },
                { name: 'ACK', active: false },
                { name: 'FIN', active: false },
                { name: 'RST', active: false },
                { name: 'PSH', active: false }
            ],
            data: null
        }, 'tcp');
        
        session.state = 'SYN_SENT';
        session.seq++;
        
        // 2. Server responds with SYN-ACK
        setTimeout(() => {
            session.ack = Math.floor(Math.random() * 1000);
            this.networkMonitor.logPacket({
                src: server.ip + ':' + server.port,
                dst: client.ip + ':' + client.port,
                seq: session.ack,
                ack: session.seq,
                window: 65535,
                flags: [
                    { name: 'SYN', active: true },
                    { name: 'ACK', active: true },
                    { name: 'FIN', active: false },
                    { name: 'RST', active: false },
                    { name: 'PSH', active: false }
                ],
                data: null
            }, 'tcp');
            
            session.state = 'SYN_RECEIVED';
            session.ack++;
            
            // 3. Client sends ACK
            setTimeout(() => {
                this.networkMonitor.logPacket({
                    src: client.ip + ':' + client.port,
                    dst: server.ip + ':' + server.port,
                    seq: session.seq,
                    ack: session.ack,
                    window: 65535,
                    flags: [
                        { name: 'SYN', active: false },
                        { name: 'ACK', active: true },
                        { name: 'FIN', active: false },
                        { name: 'RST', active: false },
                        { name: 'PSH', active: false }
                    ],
                    data: null
                }, 'tcp');
                
                session.state = 'ESTABLISHED';
                this.networkMonitor.stats.activeConnections.add(sessionKey);
                this.networkMonitor.updateStatsDisplay();
            }, 500);
        }, 500);
    }
    
    simulateDataTransfer(client, server, session, roomId, peopleCount) {
        const room = this.roomManager.rooms[roomId];
        
        // Client sends person detection data
        const personDetectionData = {
            command: 'PERSON_DETECTED',
            room: room.name,
            count: peopleCount,
            timestamp: new Date().toISOString()
        };
        
        // TCP packet with data
        this.networkMonitor.logPacket({
            src: client.ip + ':' + client.port,
            dst: server.ip + ':' + server.port,
            seq: session.seq,
            ack: session.ack,
            window: 65535,
            flags: [
                { name: 'SYN', active: false },
                { name: 'ACK', active: true },
                { name: 'FIN', active: false },
                { name: 'RST', active: false },
                { name: 'PSH', active: true }
            ],
            data: personDetectionData
        }, 'tcp');
        
        // Application layer message
        this.networkMonitor.logPacket({
            protocol: 'HTTP',
            data: {
                method: 'POST',
                uri: `/api/sensors/${roomId}/motion`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-ID': room.ip,
                    'Authorization': 'Bearer ' + this.generateMockToken()
                },
                body: personDetectionData
            }
        }, 'app');
        
        session.seq += JSON.stringify(personDetectionData).length;
        
        // Server response
        setTimeout(() => {
            const commands = [];
            
            // Light command based on occupancy
            if (peopleCount > 0) {
                commands.push({ type: 'SET_LIGHT', value: 'ON' });
            } else {
                commands.push({ type: 'SET_LIGHT', value: 'OFF' });
            }
            
            // Temperature command based on occupancy
            let targetTemp = peopleCount > 0 ? 22 : 18;
            commands.push({ type: 'SET_TEMP', value: targetTemp });
            
            const serverCommand = { commands };
            
            // TCP response packet
            this.networkMonitor.logPacket({
                src: server.ip + ':' + server.port,
                dst: client.ip + ':' + client.port,
                seq: session.ack,
                ack: session.seq,
                window: 65535,
                flags: [
                    { name: 'SYN', active: false },
                    { name: 'ACK', active: true },
                    { name: 'FIN', active: false },
                    { name: 'RST', active: false },
                    { name: 'PSH', active: true }
                ],
                data: serverCommand
            }, 'tcp');
            
            // Application layer response
            this.networkMonitor.logPacket({
                protocol: 'HTTP',
                data: {
                    status: '200 OK',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Server-ID': 'home-automation-001'
                    },
                    body: serverCommand
                }
            }, 'app');
            
            // Route commands to the room controller
            if (this.roomControllers && this.roomControllers[roomId]) {
                this.roomControllers[roomId].processServerCommands(commands);
            }
            
            session.ack += JSON.stringify(serverCommand).length;
        }, 500);
    }
    
    simulateConnectionTermination(client, server, session, sessionKey) {
        // Client sends FIN
        this.networkMonitor.logPacket({
            src: client.ip + ':' + client.port,
            dst: server.ip + ':' + server.port,
            seq: session.seq,
            ack: session.ack,
            window: 65535,
            flags: [
                { name: 'SYN', active: false },
                { name: 'ACK', active: true },
                { name: 'FIN', active: true },
                { name: 'RST', active: false },
                { name: 'PSH', active: false }
            ],
            data: null
        }, 'tcp');
        
        session.state = 'FIN_WAIT_1';
        session.seq++;
        
        // Server acknowledges and sends its own FIN
        setTimeout(() => {
            this.networkMonitor.logPacket({
                src: server.ip + ':' + server.port,
                dst: client.ip + ':' + client.port,
                seq: session.ack,
                ack: session.seq,
                window: 65535,
                flags: [
                    { name: 'SYN', active: false },
                    { name: 'ACK', active: true },
                    { name: 'FIN', active: true },
                    { name: 'RST', active: false },
                    { name: 'PSH', active: false }
                ],
                data: null
            }, 'tcp');
            
            session.state = 'LAST_ACK';
            session.ack++;
            
            // Client sends final ACK
            setTimeout(() => {
                this.networkMonitor.logPacket({
                    src: client.ip + ':' + client.port,
                    dst: server.ip + ':' + server.port,
                    seq: session.seq,
                    ack: session.ack,
                    window: 65535,
                    flags: [
                        { name: 'SYN', active: false },
                        { name: 'ACK', active: true },
                        { name: 'FIN', active: false },
                        { name: 'RST', active: false },
                        { name: 'PSH', active: false }
                    ],
                    data: null
                }, 'tcp');
                
                session.state = 'CLOSED';
                this.networkMonitor.stats.activeConnections.delete(sessionKey);
                this.networkMonitor.updateStatsDisplay();
            }, 500);
        }, 500);
    }
    
    generateMockToken() {
        // Generate a mock JWT token
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({ 
            sub: 'device_' + Math.random().toString(36).substr(2, 9),
            exp: Date.now() + 3600000 
        }));
        const signature = 'mock_signature';
        return `${header}.${payload}.${signature}`;
    }
    
    sendQuickMessage(from, to, command) {
        const fromDevice = from === 'server' ? 
            { ip: NETWORK_CONFIG.serverIP, port: NETWORK_CONFIG.serverPort } : 
            { ip: this.roomManager.rooms[from].ip, port: '1234' };
        const toDevice = to === 'server' ? 
            { ip: NETWORK_CONFIG.serverIP, port: NETWORK_CONFIG.serverPort } : 
            { ip: this.roomManager.rooms[to].ip, port: '1234' };
            
        const sessionKey = this.createSessionKey(fromDevice, toDevice);
        const session = this.initSession(sessionKey);
        
        this.networkMonitor.logPacket({
            src: fromDevice.ip + ':' + fromDevice.port,
            dst: toDevice.ip + ':' + toDevice.port,
            seq: session.seq,
            ack: session.ack,
            window: 65535,
            flags: [
                { name: 'SYN', active: false },
                { name: 'ACK', active: true },
                { name: 'FIN', active: false },
                { name: 'RST', active: false },
                { name: 'PSH', active: true }
            ],
            data: command
        }, 'tcp');
        
        session.seq += JSON.stringify(command).length;
        this.networkMonitor.updateTrafficHistory(JSON.stringify(command).length);
    }
}