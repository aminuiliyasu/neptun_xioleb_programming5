# Distributed Two Person Game System

A microservices-based distributed game system implementing a turn-based two-person game with real-time WebSocket communication.

## Architecture Overview

This project implements a distributed game system with the following components:

### Backend Microservices (Node.js/Express)
1. **User Service** - User authentication and management
2. **Room Service** - Game room creation and player management  
3. **Game Rules Service** - Game logic and turn management

### Clients
1. **CLI Client** - Command line interface (Node.js)
2. **Web Client** - Browser-based interface (HTML/CSS/JavaScript)
3. **Mobile Client** - React Native mobile application

## Technology Stack

### Backend Services
- **Language**: Node.js
- **Framework**: Express.js
- **Communication**: HTTP REST APIs + WebSocket
- **Data Storage**: In-memory (HashMap/Lists)

### Clients
- **CLI**: Node.js with readline interface
- **Web**: Vanilla HTML/CSS/JavaScript with WebSocket
- **Mobile**: React Native with WebSocket support

## Service-to-Service APIs

### User Service Endpoints
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/:userId` - Get user information
- `GET /api/users` - List all users

### Room Service Endpoints
- `POST /api/rooms` - Create new game room
- `GET /api/rooms` - List available rooms
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms/:roomId/join` - Join room
- `POST /api/rooms/:roomId/leave` - Leave room

### Game Rules Service Endpoints
- `POST /api/game/move` - Make a game move
- `GET /api/game/:gameId/status` - Get game status
- `POST /api/game/:gameId/start` - Start game
- `POST /api/game/:gameId/end` - End game

## WebSocket Communication

### Client to Server Messages
```json
{
  "type": "login",
  "data": {
    "username": "player1",
    "password": "password123"
  }
}

{
  "type": "join_room",
  "data": {
    "roomId": "room123"
  }
}

{
  "type": "make_move",
  "data": {
    "gameId": "game456",
    "move": "rock"
  }
}
```

### Server to Client Messages
```json
{
  "type": "login_success",
  "data": {
    "userId": "user123",
    "username": "player1"
  }
}

{
  "type": "room_joined",
  "data": {
    "roomId": "room123",
    "players": ["player1", "player2"]
  }
}

{
  "type": "game_update",
  "data": {
    "gameId": "game456",
    "currentPlayer": "player1",
    "board": ["rock", "paper", "scissors"],
    "status": "active"
  }
}
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies for all services
npm install

# Start all microservices
npm run start:services

# Start individual services
npm run start:user-service
npm run start:room-service  
npm run start:game-service
```

### Running Clients
```bash
# CLI Client
npm run start:cli

# Web Client (open in browser)
npm run start:web

# Mobile Client
npm run start:mobile
```

## Project Structure
```
├── services/
│   ├── user-service/
│   ├── room-service/
│   └── game-service/
├── clients/
│   ├── cli-client/
│   ├── web-client/
│   └── mobile-client/
├── shared/
│   └── types/
└── docs/
```

## Game Rules
This implementation uses a simple Rock-Paper-Scissors game where:
- Players take turns making moves
- Each move is either "rock", "paper", or "scissors"
- Winner is determined by standard Rock-Paper-Scissors rules
- Games are best of 3 rounds

## API Documentation
Detailed API documentation is available in the `/docs` directory for each service.
