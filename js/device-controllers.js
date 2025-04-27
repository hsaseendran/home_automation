// device-controllers.js

export class SmartLight {
    constructor(id, roomId, position, scene) {
        this.id = id;
        this.roomId = roomId;
        this.position = position;
        this.state = 'OFF';
        this.brightness = 0;
        this.scene = scene;
        
        // Create bulb mesh
        const bulbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        this.bulbMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x808080,
            emissive: 0x000000,
            emissiveIntensity: 0
        });
        this.bulb = new THREE.Mesh(bulbGeometry, this.bulbMaterial);
        this.bulb.position.set(position.x, position.y, position.z);
        
        // Create point light for lighting effect
        this.pointLight = new THREE.PointLight(0xffff00, 0, 8);
        this.pointLight.position.copy(this.bulb.position);
        
        this.scene.add(this.bulb);
        this.scene.add(this.pointLight);
    }
    
    handleCommand(command) {
        switch (command.type) {
            case 'SET_LIGHT':
                this.setState(command.value);
                break;
            case 'SET_BRIGHTNESS':
                this.setBrightness(command.value);
                break;
        }
    }
    
    setState(state) {
        this.state = state;
        if (state === 'ON') {
            this.bulbMaterial.color.setHex(0xffff00);
            this.bulbMaterial.emissive.setHex(0xffff00);
            this.bulbMaterial.emissiveIntensity = 0.5;
            this.pointLight.intensity = 2;
        } else {
            this.bulbMaterial.color.setHex(0x808080);
            this.bulbMaterial.emissive.setHex(0x000000);
            this.bulbMaterial.emissiveIntensity = 0;
            this.pointLight.intensity = 0;
        }
    }
    
    setBrightness(value) {
        this.brightness = value;
        if (this.state === 'ON') {
            this.pointLight.intensity = (value / 255) * 2;
            this.bulbMaterial.emissiveIntensity = (value / 255) * 0.5;
        }
    }
}

export class SmartThermostat {
    constructor(id, roomId, position, scene) {
        this.id = id;
        this.roomId = roomId;
        this.position = position;
        this.temperature = 22;
        this.targetTemperature = 22;
        this.mode = 'AUTO';
        this.scene = scene;
        
        // Create thermostat display
        const displayGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.1);
        const displayMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        this.display = new THREE.Mesh(displayGeometry, displayMaterial);
        this.display.position.set(position.x, position.y, position.z);
        
        // Create temperature display
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        this.context = canvas.getContext('2d');
        this.displayTexture = new THREE.CanvasTexture(canvas);
        
        const displayFaceMaterial = new THREE.MeshBasicMaterial({ map: this.displayTexture });
        const displayFaceGeometry = new THREE.PlaneGeometry(0.25, 0.35);
        this.displayFace = new THREE.Mesh(displayFaceGeometry, displayFaceMaterial);
        this.displayFace.position.set(position.x, position.y, position.z + 0.06);
        
        this.scene.add(this.display);
        this.scene.add(this.displayFace);
        
        this.updateDisplay();
    }
    
    handleCommand(command) {
        switch (command.type) {
            case 'SET_TEMP':
                this.setTargetTemperature(command.value);
                break;
            case 'SET_MODE':
                this.setMode(command.value);
                break;
        }
    }
    
    setTargetTemperature(temp) {
        this.targetTemperature = temp;
        this.updateDisplay();
        // Simulate gradual temperature change
        this.simulateTemperatureChange();
    }
    
    setMode(mode) {
        this.mode = mode;
        this.updateDisplay();
    }
    
    simulateTemperatureChange() {
        const tempDiff = this.targetTemperature - this.temperature;
        if (Math.abs(tempDiff) > 0.1) {
            const changeRate = tempDiff > 0 ? 0.1 : -0.1;
            this.temperature += changeRate;
            this.updateDisplay();
            setTimeout(() => this.simulateTemperatureChange(), 1000);
        }
    }
    
    updateDisplay() {
        this.context.clearRect(0, 0, 128, 128);
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, 128, 128);
        
        this.context.fillStyle = '#0f0';
        this.context.font = 'bold 32px Arial';
        this.context.textAlign = 'center';
        this.context.fillText(`${this.temperature.toFixed(1)}°C`, 64, 50);
        
        this.context.font = '16px Arial';
        this.context.fillStyle = '#fff';
        this.context.fillText(`Target: ${this.targetTemperature}°C`, 64, 80);
        this.context.fillText(this.mode, 64, 100);
        
        this.displayTexture.needsUpdate = true;
    }
}

export class MotionSensor {
    constructor(id, roomId, position, scene) {
        this.id = id;
        this.roomId = roomId;
        this.position = position;
        this.detecting = false;
        this.scene = scene;
        
        // Create sensor mesh
        const sensorGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
        const sensorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        this.sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
        this.sensor.position.set(position.x, position.y, position.z);
        this.sensor.rotation.x = Math.PI / 2;
        
        // Create indicator light
        const indicatorGeometry = new THREE.CircleGeometry(0.1, 16);
        this.indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.indicator = new THREE.Mesh(indicatorGeometry, this.indicatorMaterial);
        this.indicator.position.copy(this.sensor.position);
        this.indicator.position.z += 0.05;
        this.indicator.rotation.x = Math.PI / 2;
        
        this.scene.add(this.sensor);
        this.scene.add(this.indicator);
    }
    
    detect(peopleCount) {
        this.detecting = peopleCount > 0;
        this.indicatorMaterial.color.setHex(this.detecting ? 0x00ff00 : 0xff0000);
        return this.detecting;
    }
    
    getStatus() {
        return {
            deviceId: this.id,
            roomId: this.roomId,
            detecting: this.detecting,
            timestamp: new Date().toISOString()
        };
    }
}

export class DeviceManager {
    constructor(scene) {
        this.scene = scene;
        this.devices = new Map();
    }
    
    createDevices(roomId, roomConfig) {
        // Create smart light
        const lightPosition = {
            x: roomConfig.position.x,
            y: roomConfig.position.y + 1.7,
            z: roomConfig.position.z
        };
        const light = new SmartLight(`${roomId}-light`, roomId, lightPosition, this.scene);
        
        // Create smart thermostat
        const thermostatPosition = {
            x: roomConfig.position.x + roomConfig.size.x/2 - 0.5,
            y: roomConfig.position.y + 0.5,
            z: roomConfig.position.z
        };
        const thermostat = new SmartThermostat(`${roomId}-thermostat`, roomId, thermostatPosition, this.scene);
        
        // Create motion sensor
        const sensorPosition = {
            x: roomConfig.position.x,
            y: roomConfig.position.y + 1.9,
            z: roomConfig.position.z + roomConfig.size.z/2 - 0.5
        };
        const motionSensor = new MotionSensor(`${roomId}-motion`, roomId, sensorPosition, this.scene);
        
        // Store devices
        this.devices.set(light.id, light);
        this.devices.set(thermostat.id, thermostat);
        this.devices.set(motionSensor.id, motionSensor);
        
        return { light, thermostat, motionSensor };
    }
    
    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }
    
    getAllDevices() {
        return Array.from(this.devices.values());
    }
}