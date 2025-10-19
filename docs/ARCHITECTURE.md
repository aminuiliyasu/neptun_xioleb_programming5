# System Architecture - Distributed Game System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DISTRIBUTED GAME SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI CLIENT    │    │   WEB CLIENT    │    │ MOBILE CLIENT   │
│   (Node.js)     │    │ (HTML/CSS/JS)   │    │ (React Native)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              WebSocket (ws://localhost:3004) │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  USER SERVICE   │ │  ROOM SERVICE   │ │ GAME SERVICE    │
        │   Port: 3001    │ │   Port: 3002    │ │   Port: 3003    │
        │                 │ │                 │ │                 │
        │ • Registration  │ │ • Room Creation │ │ • Game Logic    │
        │ • Authentication│ │ • Player Join   │ │ • Move Validation│
        │ • User Management│ │ • Room Status   │ │ • Win Conditions│
        │ • Session Mgmt   │ │ • Player Mgmt   │ │ • Turn Management│
        └─────────┬───────┘ └─────────┬───────┘ └─────────┬───────┘
                  │                   │                   │
                  │        HTTP REST APIs                 │
                  │                   │                   │
                  └───────────────────┼───────────────────┘
                                      │
                              ┌───────▼───────┐
                              │  SHARED TYPES  │
                              │   (Common)     │
                              │               │
                              │ • GameStatus  │
                              │ • MoveType    │
                              │ • WebSocket   │
                              │   Messages    │
                              └───────────────┘
```

## Microservices Architecture

### 1. User Service (Port 3001)
**Responsibilities:**
- User registration and authentication
- Session management
- User profile management
- User status tracking (online/offline)

**Key Features:**
- RESTful API endpoints
- In-memory user storage
- Session-based authentication
- User validation for other services

**API Endpoints:**
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/:userId` - Get user info
- `GET /api/users` - List all users
- `POST /api/users/logout` - User logout

### 2. Room Service (Port 3002)
**Responsibilities:**
- Game room creation and management
- Player room assignment
- Room status tracking
- Integration with User Service for validation

**Key Features:**
- Room lifecycle management
- Player capacity management (max 2 players)
- Automatic game initiation when room is full
- Integration with Game Service

**API Endpoints:**
- `POST /api/rooms` - Create room
- `GET /api/rooms` - List rooms
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room

### 3. Game Rules Service (Port 3003)
**Responsibilities:**
- Game logic implementation
- Move validation and processing
- Win condition evaluation
- Turn management
- WebSocket server for real-time communication

**Key Features:**
- Rock-Paper-Scissors game logic
- Real-time WebSocket communication
- Game state management
- Round and match tracking
- Player notification system

**API Endpoints:**
- `POST /api/game/start` - Start game
- `POST /api/game/move` - Make move
- `GET /api/game/:gameId/status` - Get game status
- `GET /api/game/player/:userId` - Get player's game

**WebSocket Server (Port 3004):**
- Real-time game updates
- Player notifications
- Move broadcasting
- Game state synchronization

## Client Applications

### 1. CLI Client (Node.js)
**Technology Stack:**
- Node.js with readline interface
- Axios for HTTP requests
- WebSocket for real-time communication
- Chalk for colored terminal output

**Features:**
- Interactive command-line interface
- User authentication
- Room management
- Real-time game play
- Move input via keyboard

### 2. Web Client (HTML/CSS/JavaScript)
**Technology Stack:**
- Vanilla HTML/CSS/JavaScript
- Fetch API for HTTP requests
- WebSocket for real-time communication
- Responsive design

**Features:**
- Modern web interface
- Real-time game updates
- Room management UI
- Mobile-responsive design
- Visual game feedback

### 3. Mobile Client (React Native)
**Technology Stack:**
- React Native framework
- React Native Paper UI components
- React Native WebSocket
- Cross-platform compatibility

**Features:**
- Native mobile experience
- Touch-optimized interface
- Real-time notifications
- Offline capability considerations
- Platform-specific optimizations

## Communication Patterns

### Service-to-Service Communication
- **Protocol:** HTTP REST APIs
- **Data Format:** JSON
- **Authentication:** Session-based
- **Error Handling:** Standard HTTP status codes

### Client-Server Communication
- **Protocol:** WebSocket (ws://)
- **Data Format:** JSON messages
- **Real-time Updates:** Bidirectional communication
- **Connection Management:** Automatic reconnection

### Data Flow
1. **User Registration/Login:** Client → User Service
2. **Room Creation:** Client → Room Service → User Service (validation)
3. **Game Start:** Room Service → Game Service
4. **Real-time Updates:** Game Service → All Clients (WebSocket)
5. **Move Processing:** Client → Game Service → All Clients

## Technology Choices Rationale

### Backend Services (Node.js/Express)
- **Rapid Development:** Quick prototyping and iteration
- **JavaScript Ecosystem:** Rich package ecosystem
- **WebSocket Support:** Native WebSocket support
- **Microservices Friendly:** Lightweight and scalable
- **Cross-platform:** Works on all major operating systems

### Web Client (Vanilla JavaScript)
- **No Framework Dependencies:** Lightweight and fast
- **Universal Compatibility:** Works in all modern browsers
- **Easy Deployment:** Static files, no build process
- **Real-time Communication:** Native WebSocket support

### Mobile Client (React Native)
- **Cross-platform:** Single codebase for iOS and Android
- **Native Performance:** Near-native app performance
- **Rich UI Components:** React Native Paper for Material Design
- **WebSocket Support:** Real-time communication capabilities

### Data Storage (In-Memory)
- **Simplicity:** No database setup required
- **Performance:** Fast data access
- **Development Focus:** Focus on architecture, not data management
- **Stateless Services:** Easy horizontal scaling

## Scalability Considerations

### Horizontal Scaling
- Each service can be scaled independently
- Stateless design allows multiple instances
- Load balancer can distribute requests

### Service Discovery
- Services communicate via HTTP URLs
- Environment variables for service URLs
- Health check endpoints for monitoring

### Real-time Communication
- WebSocket server handles multiple connections
- Message broadcasting to all relevant clients
- Connection management and cleanup

## Security Considerations

### Authentication
- Session-based authentication
- User validation across services
- Secure password handling (in production)

### Communication Security
- HTTPS for production deployment
- WSS for secure WebSocket connections
- Input validation and sanitization

### Service Isolation
- Each service runs independently
- No direct database sharing
- API-based communication only

## Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ User Service│  │ Room Service│  │ Game Service│          │
│  │   :3001     │  │   :3002     │  │   :3003     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ CLI Client  │  │ Web Client  │  │ Mobile App  │          │
│  │   :8080     │  │   :8080     │  │   :8081     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Production Considerations
- Container orchestration (Docker/Kubernetes)
- Load balancing
- Service discovery
- Monitoring and logging
- Database persistence
- Security hardening
