import { SceneSetup } from './scene-setup.js';
import { RoomManager } from './room-manager.js';
import { PeopleSimulator } from './people-simulator.js';
import { NetworkMonitor } from './network-monitor.js';
import { TCPSimulator } from './tcp-simulator.js';
import { UIControls } from './ui-controls.js';
import { updateCanvasSize } from './utils/helpers.js';

class HomeAutomationSystem {
    constructor() {
        // Initialize components
        this.sceneSetup = new SceneSetup();
        this.roomManager = new RoomManager(this.sceneSetup.scene);
        this.peopleSimulator = new PeopleSimulator(this.sceneSetup.scene, this.roomManager);
        this.networkMonitor = new NetworkMonitor();
        this.tcpSimulator = new TCPSimulator(this.networkMonitor, this.roomManager);
        this.uiControls = new UIControls(
            this.sceneSetup, 
            this.peopleSimulator, 
            this.roomManager, 
            this.tcpSimulator
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
        this.networkMonitor.updateTopologyGraph();
        this.networkMonitor.updateDeviceList();
        
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