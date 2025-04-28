// Network configuration
export const NETWORK_CONFIG = {
    serverIP: '192.168.1.1',
    serverPort: '8080',
    deviceIPs: {
        livingRoom: '192.168.1.101',
        kitchen: '192.168.1.102',
        bedroom: '192.168.1.103',
        bathroom: '192.168.1.104'
    },
    macAddresses: {
        server: '00:1B:44:11:3A:B7',
        livingRoom: '00:1B:44:11:3A:B8',
        kitchen: '00:1B:44:11:3A:B9',
        bedroom: '00:1B:44:11:3A:BA',
        bathroom: '00:1B:44:11:3A:BB'
    }
};

// Room configuration
export const ROOMS_CONFIG = {
    'living-room': { 
        position: { x: -5, y: 2.5, z: -5 },
        size: { x: 8, y: 4, z: 8 },
        color: 0x98FB98,
        name: 'Living Room',
        ip: NETWORK_CONFIG.deviceIPs.livingRoom,
        temp: 22
    },
    'kitchen': { 
        position: { x: 5, y: 2.5, z: -5 },
        size: { x: 8, y: 4, z: 8 },
        color: 0xFFA07A,
        name: 'Kitchen',
        ip: NETWORK_CONFIG.deviceIPs.kitchen,
        temp: 22
    },
    'bedroom': { 
        position: { x: -5, y: 2.5, z: 5 },
        size: { x: 8, y: 4, z: 8 },
        color: 0x87CEEB,
        name: 'Bedroom',
        ip: NETWORK_CONFIG.deviceIPs.bedroom,
        temp: 22
    },
    'bathroom': { 
        position: { x: 5, y: 2.5, z: 5 },
        size: { x: 8, y: 4, z: 8 },
        color: 0xDDA0DD,
        name: 'Bathroom',
        ip: NETWORK_CONFIG.deviceIPs.bathroom,
        temp: 22
    }
};

// People movement schedule
export const PEOPLE_MOVEMENTS = {
    6: ['bedroom', 'bathroom'],
    7: ['kitchen'],
    8: ['living-room'],
    12: ['kitchen'],
    18: ['kitchen', 'living-room'],
    22: ['bedroom']
};

// Camera configuration
export const CAMERA_CONFIG = {
    initialRotation: { x: Math.PI / 8, y: Math.PI / 4 },
    initialDistance: 35,
    minDistance: 10,
    maxDistance: 50
};

// Day/Night configuration removed - lights are now based on occupancy only