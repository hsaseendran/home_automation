// ui-controls-iot.js
import { formatTime } from './utils/helpers.js';

export class UIControls {
    constructor(sceneSetup, peopleSimulator, roomManager, tcpSimulator, iotProtocols, roomControllers) {
        this.sceneSetup = sceneSetup;
        this.peopleSimulator = peopleSimulator;
        this.roomManager = roomManager;
        this.tcpSimulator = tcpSimulator;
        this.iotProtocols = iotProtocols;
        this.roomControllers = roomControllers;
        
        this.currentTime = 12;
        this.autoAdvanceInterval = null;
        
        // Track previous occupancy to detect changes
        this.previousOccupancy = {};
        Object.keys(this.roomManager.rooms).forEach(roomId => {
            this.previousOccupancy[roomId] = 0;
        });
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Reset button
        document.getElementById('reset-sim').addEventListener('click', () => {
            this.resetSimulation();
        });
        
        // Room click handling
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '4') {
                const roomIndex = parseInt(e.key) - 1;
                const roomIds = Object.keys(this.roomManager.rooms);
                if (roomIndex < roomIds.length) {
                    const roomId = roomIds[roomIndex];
                    this.peopleSimulator.incrementRoomOccupancy(roomId);
                    this.updateRoomInfo();
                }
            }
        });
    }
    
    updateRoomInfo() {
        const roomInfo = document.getElementById('room-info');
        let html = '';
        
        Object.entries(this.roomManager.rooms).forEach(([id, room], index) => {
            const peopleCount = this.peopleSimulator.getRoomOccupancy(id);
            const { lightOn, temp } = this.roomManager.updateRoomState(id, peopleCount);
            
            // Update room controller with current state
            if (this.roomControllers[id]) {
                this.roomControllers[id].updateMotionSensor(peopleCount);
            }
            
            html += `
                <div style="margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                    <strong>${room.name}</strong><br>
                    People: ${peopleCount} | 
                    Light: ${lightOn ? 'ON' : 'OFF'} | 
                    Temp: ${temp}°C
                    <br><small>Press ${index + 1} to add person</small>
                </div>
            `;
            
            // Simulate TCP connection when occupancy changes or periodically
            const occupancyChanged = peopleCount !== this.previousOccupancy[id];
            if (occupancyChanged || Math.random() < 0.1) {
                this.tcpSimulator.simulateFullConnection(id, peopleCount);
                
                // Also simulate IoT protocol messages
                this.simulateIoTMessages(id, peopleCount, lightOn, temp);
            }
            
            // Update previous occupancy
            this.previousOccupancy[id] = peopleCount;
        });
        
        roomInfo.innerHTML = html;
    }
    
    simulateIoTMessages(roomId, peopleCount, lightOn, temp) {
        // MQTT publish
        this.iotProtocols.simulateMQTT(roomId, 'sensors', {
            occupancy: peopleCount,
            light: lightOn ? 1 : 0,
            temperature: temp
        });
        
        // CoAP update
        this.iotProtocols.simulateCoAP(roomId, 'POST', `/rooms/${roomId}/status`, {
            occupancy: peopleCount,
            light: lightOn,
            temp: temp
        });
        
        // ZigBee report
        this.iotProtocols.simulateZigBee(roomId, 'occupancy', {
            count: peopleCount,
            detected: peopleCount > 0
        });
        
        // Z-Wave command
        if (lightOn) {
            this.iotProtocols.simulateZWave(roomId, 'BASIC', 'SET', { value: 255 });
        } else {
            this.iotProtocols.simulateZWave(roomId, 'BASIC', 'SET', { value: 0 });
        }
    }
    
    resetSimulation() {
        // Reset people
        this.peopleSimulator.reset();
        
        // Reset previous occupancy tracking
        Object.keys(this.previousOccupancy).forEach(roomId => {
            this.previousOccupancy[roomId] = 0;
        });
        
        this.updateRoomInfo();
    }
}