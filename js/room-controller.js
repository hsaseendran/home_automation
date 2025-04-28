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
            motionSensor: { detecting: false, peopleCount: 0 }
        };
    }
    
    // Process commands received from server via TCP
    processServerCommands(commands) {
        console.log(`Room Controller ${this.roomId} received commands:`, commands);
        
        // Log the controller message
        this.networkMonitor.logControllerMessage({
            from: 'Server',
            to: `${this.roomConfig.name} Controller`,
            type: 'command',
            action: 'PROCESS_COMMANDS',
            data: commands
        });
        
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
        // Log controller to device message
        this.networkMonitor.logControllerMessage({
            from: `${this.roomConfig.name} Controller`,
            to: `${this.roomId}-light`,
            type: 'command',
            action: 'SET_LIGHT',
            data: { state: state }
        });
        
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
        
        // Log device response
        this.networkMonitor.logDeviceMessage({
            deviceId: `${this.roomId}-light`,
            deviceType: 'light',
            event: 'STATE_CHANGED',
            data: { state: state, timestamp: new Date().toISOString() }
        });
    }
    
    // Send command to thermostat using appropriate IoT protocol
    setTemperature(temp) {
        // Log controller to device message
        this.networkMonitor.logControllerMessage({
            from: `${this.roomConfig.name} Controller`,
            to: `${this.roomId}-thermostat`,
            type: 'command',
            action: 'SET_TEMPERATURE',
            data: { temperature: temp }
        });
        
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
        
        // Log device response
        this.networkMonitor.logDeviceMessage({
            deviceId: `${this.roomId}-thermostat`,
            deviceType: 'thermostat',
            event: 'TARGET_TEMP_CHANGED',
            data: { targetTemp: temp, timestamp: new Date().toISOString() }
        });
    }
    
    // Handle motion detection
    updateMotionSensor(peopleCount) {
        const result = this.devices.motionSensor.detect(peopleCount);
        
        if (result.detecting !== this.deviceStates.motionSensor.detecting || 
            result.peopleCount !== this.deviceStates.motionSensor.peopleCount) {
            
            // State changed - send notification
            this.iotProtocols.simulateZigBee(this.roomId, 'occupancy', {
                count: peopleCount,
                detected: result.detecting
            });
            
            this.iotProtocols.simulateMQTT(this.roomId, 'sensors', {
                deviceId: `${this.roomId}-motion`,
                event: 'MOTION_DETECTED',
                value: result.detecting,
                peopleCount: peopleCount
            });
            
            this.deviceStates.motionSensor.detecting = result.detecting;
            this.deviceStates.motionSensor.peopleCount = result.peopleCount;
            
            // Log device event
            this.networkMonitor.logDeviceMessage({
                deviceId: `${this.roomId}-motion`,
                deviceType: 'sensor',
                event: 'MOTION_DETECTED',
                data: { 
                    detecting: result.detecting, 
                    peopleCount: result.peopleCount, 
                    timestamp: new Date().toISOString() 
                }
            });
            
            // Log controller notification
            this.networkMonitor.logControllerMessage({
                from: `${this.roomId}-motion`,
                to: `${this.roomConfig.name} Controller`,
                type: 'event',
                action: 'MOTION_DETECTION',
                data: { 
                    detecting: result.detecting, 
                    peopleCount: result.peopleCount 
                }
            });
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