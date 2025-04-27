// room-controller.js

export class RoomController {
    constructor(roomId, roomConfig, deviceManager, networkMonitor, iotProtocols) {
        this.roomId = roomId;
        this.roomConfig = roomConfig;
        this.deviceManager = deviceManager;
        this.networkMonitor = networkMonitor;
        this.iotProtocols = iotProtocols;
        
        // Create devices for this room
        this.devices = deviceManager.createDevices(roomId, roomConfig);
        
        // Initialize device states
        this.deviceStates = {
            light: { state: 'OFF', brightness: 0 },
            thermostat: { temperature: 22, targetTemp: 22, mode: 'AUTO' },
            motionSensor: { detecting: false }
        };
    }
    
    // Process commands received from server via TCP
    processServerCommands(commands) {
        console.log(`Room Controller ${this.roomId} received commands:`, commands);
        
        commands.forEach(command => {
            switch (command.type) {
                case 'SET_LIGHT':
                    this.setLight(command.value);
                    break;
                case 'SET_TEMP':
                    this.setTemperature(command.value);
                    break;
                case 'SET_MODE':
                    this.setThermostatMode(command.value);
                    break;
            }
        });
    }
    
    // Send command to light using appropriate IoT protocol
    setLight(state) {
        // Simulate using Zigbee for light control
        this.iotProtocols.simulateZigBee(this.roomId, 'light', {
            command: 'ON_OFF',
            value: state === 'ON' ? 1 : 0
        });
        
        // Also simulate MQTT message
        this.iotProtocols.simulateMQTT(this.roomId, 'actuators', {
            deviceId: `${this.roomId}-light`,
            command: 'SET_LIGHT',
            value: state
        });
        
        // Execute the command on the device
        this.devices.light.handleCommand({ type: 'SET_LIGHT', value: state });
        this.deviceStates.light.state = state;
        
        // Log the command execution
        this.networkMonitor.logPacket({
            src: this.roomConfig.ip + ':5000',
            dst: `${this.roomId}-light`,
            protocol: 'ZigBee',
            messageType: 'COMMAND',
            data: {
                command: 'SET_LIGHT',
                value: state,
                timestamp: new Date().toISOString()
            }
        }, 'iot');
    }
    
    // Send command to thermostat using appropriate IoT protocol
    setTemperature(temp) {
        // Simulate using Z-Wave for thermostat control
        this.iotProtocols.simulateZWave(this.roomId, 'THERMOSTAT_SETPOINT', 'SET', {
            value: temp,
            scale: 'Celsius'
        });
        
        // Also simulate CoAP message
        this.iotProtocols.simulateCoAP(this.roomId, 'PUT', `/thermostat/${this.roomId}`, {
            targetTemp: temp
        });
        
        // Execute the command on the device
        this.devices.thermostat.handleCommand({ type: 'SET_TEMP', value: temp });
        this.deviceStates.thermostat.targetTemp = temp;
        
        // Log the command execution
        this.networkMonitor.logPacket({
            src: this.roomConfig.ip + ':5000',
            dst: `${this.roomId}-thermostat`,
            protocol: 'Z-Wave',
            messageType: 'COMMAND',
            data: {
                command: 'SET_TEMP',
                value: temp,
                timestamp: new Date().toISOString()
            }
        }, 'iot');
    }
    
    // Handle motion detection
    updateMotionSensor(peopleCount) {
        const detecting = this.devices.motionSensor.detect(peopleCount);
        
        if (detecting !== this.deviceStates.motionSensor.detecting) {
            // State changed - send notification
            this.iotProtocols.simulateZigBee(this.roomId, 'occupancy', {
                count: peopleCount,
                detected: detecting
            });
            
            this.iotProtocols.simulateMQTT(this.roomId, 'sensors', {
                deviceId: `${this.roomId}-motion`,
                event: 'MOTION_DETECTED',
                value: detecting,
                peopleCount: peopleCount
            });
            
            this.deviceStates.motionSensor.detecting = detecting;
            
            // Log the event
            this.networkMonitor.logPacket({
                src: `${this.roomId}-motion`,
                dst: this.roomConfig.ip + ':5000',
                protocol: 'ZigBee',
                messageType: 'EVENT',
                data: {
                    event: 'MOTION_DETECTED',
                    detecting: detecting,
                    timestamp: new Date().toISOString()
                }
            }, 'iot');
        }
    }
    
    // Get current room status
    getRoomStatus() {
        return {
            roomId: this.roomId,
            devices: {
                light: this.deviceStates.light,
                thermostat: this.deviceStates.thermostat,
                motionSensor: this.deviceStates.motionSensor
            },
            timestamp: new Date().toISOString()
        };
    }
}