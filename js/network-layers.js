// network-layers.js
export class NetworkLayers {
    constructor(networkMonitor) {
        this.networkMonitor = networkMonitor;
        
        // OSI Model layers with colors and protocols
        this.layers = {
            physical: {
                name: 'Physical Layer',
                color: '#FF5722',
                protocols: ['Ethernet', 'WiFi', 'Bluetooth', 'USB']
            },
            dataLink: {
                name: 'Data Link Layer',
                color: '#FF9800',
                protocols: ['Ethernet', 'WiFi', 'PPP', 'MAC']
            },
            network: {
                name: 'Network Layer',
                color: '#FFC107',
                protocols: ['IP', 'ICMP', 'ARP', 'IGMP']
            },
            transport: {
                name: 'Transport Layer',
                color: '#4CAF50',
                protocols: ['TCP', 'UDP', 'SCTP']
            },
            session: {
                name: 'Session Layer',
                color: '#2196F3',
                protocols: ['NetBIOS', 'RPC', 'SIP']
            },
            presentation: {
                name: 'Presentation Layer',
                color: '#3F51B5',
                protocols: ['SSL/TLS', 'MIME', 'XDR']
            },
            application: {
                name: 'Application Layer',
                color: '#9C27B0',
                protocols: ['HTTP', 'FTP', 'SMTP', 'DNS']
            }
        };
    }
    
    // Generate Physical Layer message
    generatePhysicalMessage(roomId, event) {
        this.networkMonitor.logPacket({
            layer: 'Physical',
            protocol: 'Ethernet',
            data: {
                signal: 'Electrical/Optical Signal',
                medium: 'CAT6 Cable',
                bitrate: '1000 Mbps',
                voltage: event === 'transmit' ? '+2.5V to -2.5V' : '0V',
                status: event
            }
        }, 'physical');
    }
    
    // Generate Data Link Layer message
    generateDataLinkMessage(srcMAC, dstMAC, frameType) {
        this.networkMonitor.logPacket({
            layer: 'Data Link',
            protocol: 'Ethernet',
            data: {
                frameType: frameType,
                sourceMAC: srcMAC,
                destinationMAC: dstMAC,
                frameSize: '1518 bytes',
                checksum: this.generateChecksum(),
                vlan: 'none'
            }
        }, 'dataLink');
    }
    
    // Generate Network Layer message
    generateNetworkMessage(srcIP, dstIP, protocol = 'IPv4') {
        this.networkMonitor.logPacket({
            layer: 'Network',
            protocol: protocol,
            data: {
                sourceIP: srcIP,
                destinationIP: dstIP,
                version: protocol === 'IPv4' ? 4 : 6,
                headerLength: 20,
                ttl: 64,
                fragmentOffset: 0,
                checksum: this.generateChecksum()
            }
        }, 'network');
    }
    
    // Generate ICMP message (ping)
    generateICMPMessage(srcIP, dstIP, type) {
        this.networkMonitor.logPacket({
            layer: 'Network',
            protocol: 'ICMP',
            data: {
                type: type,
                code: 0,
                sourceIP: srcIP,
                destinationIP: dstIP,
                sequence: Math.floor(Math.random() * 100),
                identifier: Math.floor(Math.random() * 1000),
                data: type === 'echo request' ? 'ping test data' : 'pong response'
            }
        }, 'network');
    }
    
    // Generate ARP message
    generateARPMessage(senderIP, targetIP, operation) {
        const senderMAC = this.getMACFromIP(senderIP);
        const targetMAC = operation === 'request' ? '00:00:00:00:00:00' : this.getMACFromIP(targetIP);
        
        this.networkMonitor.logPacket({
            layer: 'Network',
            protocol: 'ARP',
            data: {
                operation: operation,
                senderMAC: senderMAC,
                senderIP: senderIP,
                targetMAC: targetMAC,
                targetIP: targetIP,
                hardwareType: 'Ethernet',
                protocolType: 'IPv4'
            }
        }, 'network');
    }
    
    // Generate Transport Layer message
    generateTransportMessage(protocol, srcPort, dstPort, flags) {
        if (protocol === 'UDP') {
            this.networkMonitor.logPacket({
                layer: 'Transport',
                protocol: 'UDP',
                data: {
                    sourcePort: srcPort,
                    destinationPort: dstPort,
                    length: Math.floor(Math.random() * 500) + 8,
                    checksum: this.generateChecksum()
                }
            }, 'transport');
        } else if (protocol === 'TCP') {
            // This is handled by existing TCP simulator
            return;
        }
    }
    
    // Generate Session Layer message
    generateSessionMessage(sessionId, action) {
        this.networkMonitor.logPacket({
            layer: 'Session',
            protocol: 'NetBIOS',
            data: {
                sessionId: sessionId,
                action: action,
                state: action === 'establish' ? 'connecting' :
                       action === 'maintain' ? 'active' : 'closing',
                keepAlive: action === 'maintain'
            }
        }, 'session');
    }
    
    // Generate Presentation Layer message
    generatePresentationMessage(dataType, encrypted = false) {
        this.networkMonitor.logPacket({
            layer: 'Presentation',
            protocol: encrypted ? 'SSL/TLS' : 'MIME',
            data: {
                dataType: dataType,
                encoding: 'UTF-8',
                compression: 'gzip',
                encrypted: encrypted,
                certificate: encrypted ? 'Valid SSL Certificate' : null
            }
        }, 'presentation');
    }
    
    // Helper function to generate mock checksums
    generateChecksum() {
        return Array.from({length: 4}, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
    }
    
    // Helper function to map IPs to MAC addresses
    getMACFromIP(ip) {
        const ipToMAC = {
            '192.168.1.1': '00:1B:44:11:3A:B7',
            '192.168.1.101': '00:1B:44:11:3A:B8',
            '192.168.1.102': '00:1B:44:11:3A:B9',
            '192.168.1.103': '00:1B:44:11:3A:BA',
            '192.168.1.104': '00:1B:44:11:3A:BB'
        };
        return ipToMAC[ip] || 'FF:FF:FF:FF:FF:FF';
    }
    
    // Simulate a complete network stack communication
    simulateFullStackCommunication(srcIP, dstIP, data) {
        const srcMAC = this.getMACFromIP(srcIP);
        const dstMAC = this.getMACFromIP(dstIP);
        const sessionId = Math.random().toString(36).substr(2, 9);
        
        // Physical Layer
        this.generatePhysicalMessage('transmit');
        
        // Data Link Layer
        this.generateDataLinkMessage(srcMAC, dstMAC, 'data');
        
        // Network Layer - ARP first to resolve MAC addresses
        this.generateARPMessage(srcIP, dstIP, 'request');
        setTimeout(() => {
            this.generateARPMessage(dstIP, srcIP, 'reply');
        }, 100);
        
        // Network Layer - IP packet
        setTimeout(() => {
            this.generateNetworkMessage(srcIP, dstIP);
        }, 200);
        
        // Session Layer
        setTimeout(() => {
            this.generateSessionMessage(sessionId, 'establish');
        }, 300);
        
        // Presentation Layer
        setTimeout(() => {
            this.generatePresentationMessage('application/json', true);
        }, 400);
        
        // Transport Layer (TCP is handled by existing simulator)
        // Application Layer (handled by existing simulator)
    }
    
    // Simulate ICMP ping
    simulatePing(srcIP, dstIP) {
        this.generateICMPMessage(srcIP, dstIP, 'echo request');
        setTimeout(() => {
            this.generateICMPMessage(dstIP, srcIP, 'echo reply');
        }, 100);
    }
    
    // Simulate DHCP process
    simulateDHCP(clientIP) {
        const broadcastMAC = 'FF:FF:FF:FF:FF:FF';
        const serverIP = '192.168.1.1';
        
        // DHCP Discover
        this.generateDataLinkMessage('00:00:00:00:00:00', broadcastMAC, 'broadcast');
        this.generateTransportMessage('UDP', 68, 67);
        this.networkMonitor.logPacket({
            layer: 'Application',
            protocol: 'DHCP',
            data: {
                messageType: 'DISCOVER',
                clientMAC: '00:00:00:00:00:00',
                requestedIP: '0.0.0.0'
            }
        }, 'app');
        
        // DHCP Offer
        setTimeout(() => {
            this.generateDataLinkMessage(this.getMACFromIP(serverIP), broadcastMAC, 'unicast');
            this.generateTransportMessage('UDP', 67, 68);
            this.networkMonitor.logPacket({
                layer: 'Application',
                protocol: 'DHCP',
                data: {
                    messageType: 'OFFER',
                    offeredIP: clientIP,
                    subnet: '255.255.255.0',
                    gateway: serverIP,
                    dns: '8.8.8.8'
                }
            }, 'app');
        }, 500);
        
        // DHCP Request
        setTimeout(() => {
            this.generateDataLinkMessage('00:00:00:00:00:00', broadcastMAC, 'broadcast');
            this.generateTransportMessage('UDP', 68, 67);
            this.networkMonitor.logPacket({
                layer: 'Application',
                protocol: 'DHCP',
                data: {
                    messageType: 'REQUEST',
                    requestedIP: clientIP
                }
            }, 'app');
        }, 1000);
        
        // DHCP ACK
        setTimeout(() => {
            this.generateDataLinkMessage(this.getMACFromIP(serverIP), this.getMACFromIP(clientIP), 'unicast');
            this.generateTransportMessage('UDP', 67, 68);
            this.networkMonitor.logPacket({
                layer: 'Application',
                protocol: 'DHCP',
                data: {
                    messageType: 'ACK',
                    assignedIP: clientIP,
                    leaseTime: '86400 seconds'
                }
            }, 'app');
        }, 1500);
    }
}