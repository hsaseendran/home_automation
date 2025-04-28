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
import { NetworkLayers } from './network-layers.js';
import { updateCanvasSize } from './utils/helpers.js';

class HomeAutomationSystem {
    constructor() {
        // Initialize components
        this.sceneSetup = new SceneSetup();
        this.roomManager = new RoomManager(this.sceneSetup.scene);
        this.peopleSimulator = new PeopleSimulator(this.sceneSetup.scene, this.roomManager);
        this.networkMonitor = new NetworkMonitor();
        this.deviceManager = new DeviceManager(this.sceneSetup.scene);
        this.iotProtocols = new IoTProtocols(this.networkMonitor, this.roomManager);
        this.networkLayers = new NetworkLayers(this.networkMonitor);
        
        // Initialize room controllers
        this.roomControllers = {};
        Object.keys(this.roomManager.rooms).forEach(roomId => {
            this.roomControllers[roomId] = new RoomController(
                roomId,
                this.roomManager.rooms[roomId],
                this.deviceManager,
                this.networkMonitor,
                this.iotProtocols
            );
        });
        
        // Initialize TCP simulator with room controllers and network layers
        this.tcpSimulator = new TCPSimulator(this.networkMonitor, this.roomManager);
        this.tcpSimulator.setRoomControllers(this.roomControllers);
        this.tcpSimulator.setNetworkLayers(this.networkLayers);
        
        // Initialize UI controls
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
        
        // Log initial controller message
        this.networkMonitor.logControllerMessage({
            from: 'Server',
            to: 'All Controllers',
            type: 'status',
            action: 'SYSTEM_INITIALIZATION',
            data: { status: 'ready', timestamp: new Date().toISOString() }
        });
        
        // Initialize IoT protocols for each room
        Object.keys(this.roomManager.rooms).forEach(roomId => {
            // Device registration messages
            this.networkMonitor.logDeviceMessage({
                deviceId: `${roomId}-light`,
                deviceType: 'light',
                event: 'DEVICE_REGISTERED',
                data: { name: `${roomId} Light`, capabilities: ['ON_OFF', 'BRIGHTNESS'] }
            });
            
            this.networkMonitor.logDeviceMessage({
                deviceId: `${roomId}-thermostat`,
                deviceType: 'thermostat',
                event: 'DEVICE_REGISTERED',
                data: { name: `${roomId} Thermostat`, capabilities: ['TEMPERATURE', 'MODE'] }
            });
            
            this.networkMonitor.logDeviceMessage({
                deviceId: `${roomId}-motion`,
                deviceType: 'sensor',
                event: 'DEVICE_REGISTERED',
                data: { name: `${roomId} Motion Sensor`, capabilities: ['MOTION_DETECTION'] }
            });
            
            // IoT protocol initialization
            this.iotProtocols.simulateZigBee(roomId, 'join', { 
                capabilities: ['Router', 'Mains-powered'] 
            });
            
            // Simulate MQTT subscription
            this.iotProtocols.simulateMQTT(roomId, 'status', {
                event: 'subscribe',
                topic: `/home/${roomId}/control`
            });
            
            // Simulate initial network stack setup
            this.networkLayers.simulateDHCP(this.roomManager.rooms[roomId].ip);
            
            // Simulate device ping check
            setTimeout(() => {
                this.networkLayers.simulatePing('192.168.1.1', this.roomManager.rooms[roomId].ip);
            }, 2000);
        });
        
        // Start periodic IoT updates
        this.iotProtocols.startPeriodicUpdates();
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