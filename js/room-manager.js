import { ROOMS_CONFIG } from './utils/constants.js';
import { createStatusPanel } from './utils/helpers.js';

export class RoomManager {
    constructor(scene) {
        this.scene = scene;
        this.rooms = { ...ROOMS_CONFIG };
        this.roomMeshes = {};
        this.lights = {};
        this.detectors = {};
        this.statusPanels = {};
        this.connections = {};
        this.server = null;
        
        this.setupRooms();
        this.setupServer();
        this.setupConnections();
    }
    
    setupRooms() {
        Object.entries(this.rooms).forEach(([id, room]) => {
            // Room mesh
            const geometry = new THREE.BoxGeometry(room.size.x, room.size.y, room.size.z);
            const material = new THREE.MeshPhongMaterial({ 
                color: room.color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(room.position.x, room.position.y, room.position.z);
            this.scene.add(mesh);
            this.roomMeshes[id] = mesh;
            
            // Glow effect
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: room.color,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
            });
            const glowMesh = new THREE.Mesh(geometry.clone(), glowMaterial);
            glowMesh.position.copy(mesh.position);
            glowMesh.scale.set(1.02, 1.02, 1.02);
            this.scene.add(glowMesh);
            mesh.glowMesh = glowMesh;
            
            // Light fixture
            const lightFixtureGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
            const lightFixtureMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const lightFixture = new THREE.Mesh(lightFixtureGeometry, lightFixtureMaterial);
            lightFixture.position.set(room.position.x, room.position.y + 1.9, room.position.z);
            this.scene.add(lightFixture);
            
            // Light bulb
            const bulbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const bulbMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x808080,
                emissive: 0x000000,
                emissiveIntensity: 0
            });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            bulb.position.set(room.position.x, room.position.y + 1.7, room.position.z);
            this.scene.add(bulb);
            this.lights[id] = bulb;
            
            // Point light
            const pointLight = new THREE.PointLight(0xffff00, 0, 8);
            pointLight.position.copy(bulb.position);
            this.scene.add(pointLight);
            bulb.pointLight = pointLight;
            
            // Motion detector
            const detectorGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
            const detectorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const detector = new THREE.Mesh(detectorGeometry, detectorMaterial);
            detector.position.set(
                room.position.x,
                room.position.y + 1.9,
                room.position.z + room.size.z/2 - 0.5
            );
            detector.rotation.x = Math.PI / 2;
            this.scene.add(detector);
            
            // Detector indicator
            const indicatorGeometry = new THREE.CircleGeometry(0.1, 16);
            const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
            indicator.position.copy(detector.position);
            indicator.position.z += 0.05;
            indicator.rotation.x = Math.PI / 2;
            this.scene.add(indicator);
            this.detectors[id] = indicator;
            
            // Status panel
            const { canvas, context, texture } = createStatusPanel();
            const panelMaterial = new THREE.SpriteMaterial({ map: texture });
            const panel = new THREE.Sprite(panelMaterial);
            panel.scale.set(2, 1, 1);
            panel.position.set(room.position.x, room.position.y + 2.5, room.position.z);
            this.scene.add(panel);
            this.statusPanels[id] = { sprite: panel, canvas, context, texture };
            
            this.updateStatusPanel(id, 0);
        });
    }
    
    setupServer() {
        const serverGeometry = new THREE.BoxGeometry(2, 2, 2);
        const serverMaterial = new THREE.MeshPhongMaterial({ color: 0x2196F3 });
        this.server = new THREE.Mesh(serverGeometry, serverMaterial);
        this.server.position.set(0, 10, 0);
        this.scene.add(this.server);
    }
    
    setupConnections() {
        Object.entries(this.rooms).forEach(([id, room]) => {
            const points = [];
            points.push(new THREE.Vector3(0, 10, 0));
            points.push(new THREE.Vector3(room.position.x, room.position.y, room.position.z));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x2196F3, opacity: 0.5, transparent: true });
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.connections[id] = line;
        });
    }
    
    updateStatusPanel(roomId, peopleCount) {
        const panel = this.statusPanels[roomId];
        const room = this.rooms[roomId];
        
        panel.context.clearRect(0, 0, panel.canvas.width, panel.canvas.height);
        panel.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        panel.context.fillRect(0, 0, panel.canvas.width, panel.canvas.height);
        
        panel.context.fillStyle = 'white';
        panel.context.font = 'bold 20px Arial';
        panel.context.fillText(room.name, 10, 30);
        
        panel.context.font = '16px Arial';
        panel.context.fillText(`People: ${peopleCount}`, 10, 55);
        panel.context.fillText(`Temp: ${room.temp}°C`, 10, 75);
        panel.context.fillText(`IP: ${room.ip}`, 10, 95);
        
        panel.texture.needsUpdate = true;
    }
    
    updateRoomState(roomId, peopleCount, currentTime) {
        const room = this.rooms[roomId];
        const light = this.lights[roomId];
        const detector = this.detectors[roomId];
        const roomMesh = this.roomMeshes[roomId];
        
        // Update people detector
        detector.material.color.setHex(peopleCount > 0 ? 0x00ff00 : 0xff0000);
        
        // Light control
        const isDaytime = currentTime >= 7 && currentTime < 19;
        const lightOn = peopleCount > 0 && !isDaytime;
        light.material.color.setHex(lightOn ? 0xffff00 : 0x808080);
        light.material.emissive.setHex(lightOn ? 0xffff00 : 0x000000);
        light.material.emissiveIntensity = lightOn ? 0.5 : 0;
        light.pointLight.intensity = lightOn ? 2 : 0;
        
        // Room illumination
        if (lightOn) {
            roomMesh.glowMesh.material.opacity = 0.3;
            roomMesh.glowMesh.material.color.setHex(0xffff99);
        } else {
            roomMesh.glowMesh.material.opacity = 0;
            roomMesh.glowMesh.material.color.setHex(room.color);
        }
        
        // Temperature control
        let temp = 22;
        if (peopleCount > 0) {
            if (currentTime >= 6 && currentTime <= 9) temp = 23;
            else if (currentTime >= 17 && currentTime <= 22) temp = 24;
            else if (currentTime >= 22 || currentTime <= 6) temp = 20;
        } else {
            temp = 18;
        }
        room.temp = temp;
        
        this.updateStatusPanel(roomId, peopleCount);
        
        return { lightOn, temp, isDaytime };
    }
    
    animateConnection(roomId, duration = 1000) {
        if (this.connections[roomId]) {
            this.connections[roomId].material.color.setHex(0x4CAF50);
            this.connections[roomId].material.opacity = 1.0;
            setTimeout(() => {
                this.connections[roomId].material.color.setHex(0x2196F3);
                this.connections[roomId].material.opacity = 0.5;
            }, duration);
        }
    }
    
    animateServer() {
        this.server.rotation.y += 0.01;
    }
}