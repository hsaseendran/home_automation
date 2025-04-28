import { CAMERA_CONFIG } from './utils/constants.js';
import { updateCameraPosition } from './utils/helpers.js';

export class SceneSetup {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, 
            (window.innerWidth * 0.7) / (window.innerHeight * 0.8), 
            0.1, 
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.8);
        this.renderer.setClearColor(0xeeeeee);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        this.cameraRotation = { ...CAMERA_CONFIG.initialRotation };
        this.cameraDistance = CAMERA_CONFIG.initialDistance;
        
        this.setupLighting();
        this.setupEnvironment();
        this.setupCameraControls();
        
        updateCameraPosition(this.camera, this.cameraRotation, this.cameraDistance);
    }
    
    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(this.ambientLight);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(10, 20, 10);
        this.scene.add(this.directionalLight);
    }
    
    setupEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8b7355,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.scene.add(this.ground);
        
        // Simple background color instead of sky dome
        this.scene.background = new THREE.Color(0x87CEEB);
    }
    
    setupCameraControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };
            
            this.cameraRotation.y += deltaMove.x * 0.005;
            this.cameraRotation.x -= deltaMove.y * 0.005;
            this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
            
            updateCameraPosition(this.camera, this.cameraRotation, this.cameraDistance);
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.renderer.domElement.addEventListener('mouseleave', () => {
            isDragging = false;
        });
        
        this.renderer.domElement.addEventListener('wheel', (e) => {
            this.cameraDistance += e.deltaY * 0.05;
            this.cameraDistance = Math.min(Math.max(this.cameraDistance, CAMERA_CONFIG.minDistance), CAMERA_CONFIG.maxDistance);
            updateCameraPosition(this.camera, this.cameraRotation, this.cameraDistance);
        });
    }
    
    // Method removed - no longer needed without day/night cycle
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}