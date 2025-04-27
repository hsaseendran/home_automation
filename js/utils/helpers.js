// Format time as HH:00
export function formatTime(hour) {
    return `${hour.toString().padStart(2, '0')}:00`;
}

// Create a canvas texture for room status panels
export function createStatusPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    
    return { canvas, context, texture };
}

// Update canvas dimensions on window resize
export function updateCanvasSize(renderer, camera) {
    const width = window.innerWidth * 0.7;
    const height = window.innerHeight * 0.8;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Get camera spherical coordinates from rotation
export function updateCameraPosition(camera, rotation, distance) {
    camera.position.x = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
    camera.position.y = distance * Math.sin(rotation.x);
    camera.position.z = distance * Math.cos(rotation.y) * Math.cos(rotation.x);
    camera.lookAt(0, 5, 0);
}

// Create gradient for traffic graph
export function createGradient(ctx, color, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    return gradient;
}

// Exponential interpolation for smooth transitions
export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Clamp value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Generate random position within room bounds
export function getRandomPositionInRoom(room) {
    const offsetX = (Math.random() - 0.5) * (room.size.x - 2);
    const offsetZ = (Math.random() - 0.5) * (room.size.z - 2);
    
    return {
        x: room.position.x + offsetX,
        y: 0.75,
        z: room.position.z + offsetZ
    };
}

// Format bytes to readable string
export function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Debounce function for performance
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}