# 3D TCP/IP Home Automation System

A 3D visualization of a home automation system that demonstrates TCP/IP networking concepts with real-time packet monitoring.

## Project Structure

```
home-automation/
├── index.html          # Main HTML file
├── css/
│   ├── main.css       # Core styles
│   └── network-monitor.css  # Network monitor panel styles
├── js/
│   ├── main.js        # Application entry point
│   ├── scene-setup.js # Three.js scene initialization
│   ├── network-monitor-iot.js # Network monitoring UI
│   ├── tcp-simulator.js # TCP/IP packet simulation
│   ├── room-manager.js # Room state management
│   ├── people-simulator.js # People movement simulation
│   ├── ui-controls-iot.js # User interface controls
│   ├── iot-protocols.js # Iot protocols
│   ├── network-layers.js # Network layers for monitoring
│   └── utils/
│       ├── constants.js # Configuration constants
│       └── helpers.js   # Utility functions
└── README.md
```

## Features

- 3D visualization of a four-room home
- Real-time TCP/IP packet simulation
- Automatic lighting control based on occupancy
- Temperature control based on room occupancy  
- Interactive network monitoring with:
  - TCP packet visualization
  - Network statistics
  - Device topology map
  - Traffic graphs

## How to Run

1. Clone or download the project files
2. Ensure all files maintain the folder structure shown above
3. Serve the files using a local web server:
   - Using Python 3: `python -m http.server 8000`
   - Using Node.js: `npx serve`
   - Using Live Server in VS Code
4. Open your browser and navigate to `http://localhost:8000` (or the appropriate port)

## Controls

- **Mouse**: Drag to rotate view, scroll to zoom
- **Keyboard**: Press 1-4 to add people to rooms
- **Reset**: Reset simulation to initial state

## Dependencies

- Three.js (loaded via CDN)
- No other external dependencies

## Browser Support

Modern browsers with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## Architecture

The application uses a modular architecture with the following components:

- **SceneSetup**: Initializes the 3D scene, lighting, and camera
- **RoomManager**: Manages room states, lights, and automation equipment
- **PeopleSimulator**: Handles people movement and room occupancy
- **NetworkMonitor**: Displays network activity and statistics
- **TCPSimulator**: Simulates TCP/IP connections and messages
- **UIControls**: Handles user interface interactions

Each component is designed to be independent and communicates through well-defined interfaces.

## TCP/IP Simulation

The simulation demonstrates:
- TCP three-way handshake
- Data transfer with flags (SYN, ACK, FIN, PSH)
- Connection termination
- Real-world home automation protocols

## Customization

Key configuration files:
- `js/utils/constants.js`: Network and room configuration
- `js/utils/helpers.js`: Utility functions
- CSS files: Styling and layout

## License

MIT License - Feel free to use and modify for educational purposes.