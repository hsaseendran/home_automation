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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Time slider
        const timeSlider = document.getElementById('time-slider');
        timeSlider.addEventListener('input', (e) => {
            this.currentTime = parseInt(e.target.value);
            document.getElementById('current-time').textContent = formatTime(this.currentTime);
            this.sceneSetup.updateDayNightCycle(this.currentTime);
            
            // Simulate people movement based on time
            if (this.peopleSimulator.simulateMovement(this.currentTime)) {
                this.updateRoomInfo();
            }
        });
        
        // Auto-advance button
        const autoAdvanceBtn = document.getElementById('auto-advance');
        autoAdvanceBtn.addEventListener('click', () => {
            if (this.autoAdvanceInterval) {
                clearInterval(this.autoAdvanceInterval);
                this.autoAdvanceInterval = null;
                autoAdvanceBtn.textContent = 'Auto-Advance Time';
            } else {
                this.autoAdvanceInterval = setInterval(() => {
                    this.currentTime = (this.currentTime + 1) % 24;
                    timeSlider.value = this.currentTime;
                    document.getElementById('current-time').textContent = formatTime(this.currentTime);
                    this.sceneSetup.updateDayNightCycle(this.currentTime);
                    
                    if (this.peopleSimulator.simulateMovement(this.currentTime)) {
                        this.updateRoomInfo();
                    }
                }, 2000);
                autoAdvanceBtn.textContent = 'Stop Auto-Advance';
            }
        });
        
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
            const controller = this.roomControllers[id];
            
            // Update motion sensor with people count
            controller.updateMotionSensor(peopleCount);
            
            // Get device status for display
            const status = controller.getRoomStatus();
            
            html += `
                <div style="margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                    <strong>${room.name}</strong><br>
                    People: ${peopleCount} | 
                    Light: ${status.devices.light.state} | 
                    Temp: ${status.devices.thermostat.temperature.toFixed(1)}°C → ${status.devices.thermostat.targetTemp}°C | 
                    Motion: ${status.devices.motionSensor.detecting ? 'Yes' : 'No'}
                    <br><small>Press ${index + 1} to add person</small>
                </div>
            `;
            
            // Simulate TCP connection when state changes
            if (peopleCount > 0 || Math.random() < 0.1) {
                this.tcpSimulator.simulateFullConnection(id, peopleCount);
            }
        });
        
        roomInfo.innerHTML = html;
    }
    
    resetSimulation() {
        // Reset time
        this.currentTime = 12;
        document.getElementById('time-slider').value = this.currentTime;
        document.getElementById('current-time').textContent = formatTime(this.currentTime);
        this.sceneSetup.updateDayNightCycle(this.currentTime);
        
        // Clear auto-advance
        if (this.autoAdvanceInterval) {
            clearInterval(this.autoAdvanceInterval);
            this.autoAdvanceInterval = null;
            document.getElementById('auto-advance').textContent = 'Auto-Advance Time';
        }
        
        // Reset people
        this.peopleSimulator.reset();
        
        // Reset all device states
        Object.values(this.roomControllers).forEach(controller => {
            controller.setLight('OFF');
            controller.setTemperature(22);
        });
        
        this.updateRoomInfo();
    }
}