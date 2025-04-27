import { PEOPLE_MOVEMENTS } from './utils/constants.js';
import { getRandomPositionInRoom } from './utils/helpers.js';

export class PeopleSimulator {
    constructor(scene, roomManager) {
        this.scene = scene;
        this.roomManager = roomManager;
        this.people = [];
        this.peopleInRooms = {
            'living-room': 0,
            'kitchen': 0,
            'bedroom': 0,
            'bathroom': 0
        };
        
        this.peopleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        this.peopleMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
    }
    
    updatePeople() {
        // Remove existing people
        this.people.forEach(person => this.scene.remove(person));
        this.people.length = 0;
        
        // Add new people based on room occupancy
        Object.entries(this.peopleInRooms).forEach(([roomId, count]) => {
            const room = this.roomManager.rooms[roomId];
            for (let i = 0; i < count; i++) {
                const person = new THREE.Mesh(this.peopleGeometry, this.peopleMaterial);
                const position = getRandomPositionInRoom(room);
                person.position.set(position.x, position.y, position.z);
                this.scene.add(person);
                this.people.push(person);
            }
        });
    }
    
    simulateMovement(currentTime) {
        if (PEOPLE_MOVEMENTS[currentTime]) {
            // Clear all rooms
            Object.keys(this.peopleInRooms).forEach(room => {
                this.peopleInRooms[room] = 0;
            });
            
            // Add people to specified rooms
            PEOPLE_MOVEMENTS[currentTime].forEach(room => {
                this.peopleInRooms[room] = Math.floor(Math.random() * 3) + 1;
            });
            
            this.updatePeople();
            return true; // Movement occurred
        }
        return false; // No movement at this time
    }
    
    animatePeople() {
        this.people.forEach(person => {
            person.rotation.y += 0.01;
        });
    }
    
    getRoomOccupancy(roomId) {
        return this.peopleInRooms[roomId];
    }
    
    setRoomOccupancy(roomId, count) {
        this.peopleInRooms[roomId] = Math.max(0, count);
        this.updatePeople();
    }
    
    incrementRoomOccupancy(roomId) {
        this.peopleInRooms[roomId] = (this.peopleInRooms[roomId] + 1) % 4;
        this.updatePeople();
    }
    
    reset() {
        Object.keys(this.peopleInRooms).forEach(room => {
            this.peopleInRooms[room] = 0;
        });
        this.updatePeople();
    }
}