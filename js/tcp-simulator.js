// tcp-simulator.js
import { NETWORK_CONFIG } from './utils/constants.js';

export class TCPSimulator {
    constructor(networkMonitor, roomManager) {
        this.networkMonitor = networkMonitor;
        this.roomManager = roomManager;
        this.roomControllers = null;
        this.tcpSessions = {};
    }
    
    setRoomControllers(controllers) {
        this.roomControllers = controllers;
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
        
        this.simulateThreeWayHandshake(client, server, session, sessionKey);
        
        setTimeout(() => {
            this.simulateDataTransfer(client, server, session, roomId, peopleCount);
        }, 1500);
        
        setTimeout(() => {
            this.simulateConnectionTermination(client, server, session, sessionKey);
        }, 3000);
        
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
        });
        
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
            });
            
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
                });
                
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
        });
        
        session.seq += JSON.stringify(personDetectionData).length;
        
        // Server acknowledges and sends commands
        setTimeout(() => {
            // Server logic to determine commands based on people count and time
            const currentTime = new Date().getHours();
            const isDaytime = currentTime >= 7 && currentTime < 19;
            const commands = [];
            
            // Light command based on occupancy and time
            if (peopleCount > 0 && !isDaytime) {
                commands.push({ type: 'SET_LIGHT', value: 'ON' });
            } else if (peopleCount === 0) {
                commands.push({ type: 'SET_LIGHT', value: 'OFF' });
            }
            
            // Temperature command based on occupancy and time
            let targetTemp = 18; // Default unoccupied temp
            if (peopleCount > 0) {
                if (currentTime >= 6 && currentTime <= 9) targetTemp = 23;
                else if (currentTime >= 17 && currentTime <= 22) targetTemp = 24;
                else if (currentTime >= 22 || currentTime <= 6) targetTemp = 20;
                else targetTemp = 22;
            }
            commands.push({ type: 'SET_TEMP', value: targetTemp });
            
            const serverCommand = { commands };
            
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
            });
            
            // Now route commands to the room controller
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
        });
        
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
            });
            
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
                });
                
                session.state = 'CLOSED';
                this.networkMonitor.stats.activeConnections.delete(sessionKey);
                this.networkMonitor.updateStatsDisplay();
            }, 500);
        }, 500);
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
        });
        
        session.seq += JSON.stringify(command).length;
        this.networkMonitor.updateTrafficHistory(JSON.stringify(command).length);
    }
}