// main.js
import { SceneSetup } from './scene-setup.js';
import { RoomManager } from './room-manager.js';
import { PeopleSimulator } from './people-simulator.js';
import { NetworkMonitor } from './network-monitor-iot.js';
import { TCPSimulator } from './tcp-simulator.js';
import { IoTProtocols } from './iot-protocols.js';
import { UIControls } from './ui-controls-iot.js';
import { DeviceManager } from './device-controllers.js';
import { RoomController } from './room-controller.js';
import { updateCanvasSize } from './utils/helpers.js';

class HomeAutomationSystem {
    constructor() {
        // Initialize components
        this.sceneSetup = new SceneSetup();
        this.deviceManager = new DeviceManager(this.sceneSetup.scene);
        this.roomManager = new RoomManager(this.sceneSetup.scene);
        this.peopleSimulator = new PeopleSimulator(this.sceneSetup.scene, this.roomManager);
        this.networkMonitor = new NetworkMonitor();
        this.tcpSimulator = new TCPSimulator(this.networkMonitor, this.roomManager);
        this.iotProtocols = new IoTProtocols(this.networkMonitor, this.roomManager);
        
        // Create room controllers
        this.roomControllers = {};
        Object.entries(this.roomManager.rooms).forEach(([roomId, roomConfig]) => {
            this.roomControllers[roomId] = new RoomController(
                roomId, 
                roomConfig, 
                this.deviceManager, 
                this.networkMonitor, 
                this.iotProtocols
            );
        });
        
        // Enhance TCP simulator to work with room controllers
        this.tcpSimulator.setRoomControllers(this.roomControllers);
        
        this.uiControls = new UIControls(
            this.sceneSetup, 
            this.peopleSimulator, 
            this.roomManager, 
            this.tcpSimulator,
            this.iotProtocols,
            this.roomControllers
        );
        
        // Handle window resize
        window.addEventListener('resize', () => {
            updateCanvasSize(this.sceneSetup.renderer, this.sceneSetup.camera);
        });
        
        // Start animation loop
        this.animate();
        
        // Initialize system
        this.initialize();
    }
    
    initialize() {
        // Initialize people and display
        this.peopleSimulator.updatePeople();
        this.uiControls.updateRoomInfo();
        this.sceneSetup.updateDayNightCycle(this.uiControls.currentTime);
        
        // Log initial network message
        this.networkMonitor.logPacket({
            src: '192.168.1.1:8080',
            dst: '0.0.0.0:0',
            seq: 0,
            ack: 0,
            window: 65535,
            flags: [{ name: 'LISTEN', active: true }],
            data: 'Home Automation Server initialized'
        });
        
        // Initialize IoT devices
        Object.values(this.roomControllers).forEach(controller => {
            // Simulate device registration
            const devices = controller.devices;
            
            // Register light
            this.iotProtocols.simulateZigBee(controller.roomId, 'join', { 
                deviceId: devices.light.id,
                deviceType: 'SmartLight',
                capabilities: ['ON_OFF', 'DIMMING'] 
            });
            
            // Register thermostat
            this.iotProtocols.simulateZWave(controller.roomId, 'ADD_NODE', 'START', {
                deviceId: devices.thermostat.id,
                deviceType: 'Thermostat',
                capabilities: ['TEMPERATURE', 'SETPOINT', 'MODE']
            });
            
            // Register motion sensor
            this.iotProtocols.simulateZigBee(controller.roomId, 'join', { 
                deviceId: devices.motionSensor.id,
                deviceType: 'MotionSensor',
                capabilities: ['OCCUPANCY', 'BINARY_SENSOR'] 
            });
        });
        
        // Start periodic IoT updates
        this.iotProtocols.startPeriodicUpdates();
        
        // Start periodic device status updates
        setInterval(() => {
            Object.values(this.roomControllers).forEach(controller => {
                const status = controller.getRoomStatus();
                this.iotProtocols.simulateMQTT(controller.roomId, 'status', status);
            });
        }, 10000);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Animate people
        this.peopleSimulator.animatePeople();
        
        // Animate server
        this.roomManager.animateServer();
        
        // Render scene
        this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homeAutomationSystem = new HomeAutomationSystem();
});