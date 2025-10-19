# API Documentation - Distributed Game System

## Overview

This document describes the APIs for the Distributed Game System, including service-to-service communication and WebSocket messaging protocols.

## Service Architecture

### Service URLs
- **User Service**: `http://localhost:3001`
- **Room Service**: `http://localhost:3002`
- **Game Service**: `http://localhost:3003`
- **WebSocket Server**: `ws://localhost:3004`

## User Service API

### Base URL: `http://localhost:3001`

#### POST /api/users/register
Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

#### POST /api/users/login
Login an existing user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

#### GET /api/users/:userId
Get user information by ID.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "status": "online|offline"
  }
}
```

#### GET /api/users
Get all users.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "status": "online|offline"
    }
  ]
}
```

#### POST /api/users/logout
Logout a user.

**Request Body:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

## Room Service API

### Base URL: `http://localhost:3002`

#### POST /api/rooms
Create a new game room.

**Request Body:**
```json
{
  "hostUserId": "uuid",
  "roomName": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "string",
    "hostId": "uuid",
    "players": ["uuid"],
    "maxPlayers": 2,
    "status": "waiting|ready|active",
    "createdAt": "ISO string"
  }
}
```

#### GET /api/rooms
Get all available rooms.

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "id": "uuid",
      "name": "string",
      "hostId": "uuid",
      "playerCount": 1,
      "maxPlayers": 2,
      "status": "waiting|ready|active",
      "createdAt": "ISO string"
    }
  ]
}
```

#### GET /api/rooms/:roomId
Get room details by ID.

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "string",
    "hostId": "uuid",
    "players": ["uuid"],
    "maxPlayers": 2,
    "status": "waiting|ready|active",
    "createdAt": "ISO string"
  }
}
```

#### POST /api/rooms/:roomId/join
Join a room.

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "string",
    "hostId": "uuid",
    "players": ["uuid"],
    "maxPlayers": 2,
    "status": "waiting|ready|active",
    "createdAt": "ISO string"
  }
}
```

#### POST /api/rooms/:roomId/leave
Leave a room.

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "string",
    "hostId": "uuid",
    "players": ["uuid"],
    "maxPlayers": 2,
    "status": "waiting|ready|active",
    "createdAt": "ISO string"
  }
}
```

## Game Service API

### Base URL: `http://localhost:3003`

#### POST /api/game/start
Start a new game (called by Room Service).

**Request Body:**
```json
{
  "roomId": "uuid",
  "players": ["uuid", "uuid"]
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "uuid",
    "roomId": "uuid",
    "players": ["uuid"],
    "currentPlayer": "uuid",
    "moves": {},
    "rounds": [],
    "currentRound": 1,
    "maxRounds": 3,
    "status": "active",
    "winner": null,
    "createdAt": "ISO string"
  }
}
```

#### POST /api/game/move
Make a move in the game.

**Request Body:**
```json
{
  "userId": "uuid",
  "gameId": "uuid",
  "move": "rock|paper|scissors"
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "uuid",
    "roomId": "uuid",
    "players": ["uuid"],
    "currentPlayer": "uuid",
    "moves": {
      "uuid": "rock|paper|scissors"
    },
    "rounds": [],
    "currentRound": 1,
    "maxRounds": 3,
    "status": "active|finished",
    "winner": "uuid|null",
    "createdAt": "ISO string"
  }
}
```

#### GET /api/game/:gameId/status
Get game status by ID.

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "uuid",
    "roomId": "uuid",
    "players": ["uuid"],
    "currentPlayer": "uuid",
    "moves": {
      "uuid": "rock|paper|scissors"
    },
    "rounds": [
      {
        "round": 1,
        "moves": {
          "uuid": "rock|paper|scissors"
        },
        "result": {
          "winner": "player1|player2|null",
          "result": "win|lose|draw"
        }
      }
    ],
    "currentRound": 1,
    "maxRounds": 3,
    "status": "active|finished",
    "winner": "uuid|null",
    "createdAt": "ISO string"
  }
}
```

#### GET /api/game/player/:userId
Get player's current game.

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "uuid",
    "roomId": "uuid",
    "players": ["uuid"],
    "currentPlayer": "uuid",
    "moves": {},
    "rounds": [],
    "currentRound": 1,
    "maxRounds": 3,
    "status": "active|finished",
    "winner": "uuid|null",
    "createdAt": "ISO string"
  }
}
```

## WebSocket Communication

### Connection URL: `ws://localhost:3004?userId={userId}`

### Client to Server Messages

#### Login
```json
{
  "type": "login",
  "data": {
    "username": "string",
    "password": "string"
  }
}
```

#### Join Room
```json
{
  "type": "join_room",
  "data": {
    "roomId": "uuid"
  }
}
```

#### Leave Room
```json
{
  "type": "leave_room",
  "data": {
    "roomId": "uuid"
  }
}
```

#### Make Move
```json
{
  "type": "make_move",
  "data": {
    "gameId": "uuid",
    "move": "rock|paper|scissors"
  }
}
```

#### Get Game Status
```json
{
  "type": "get_game_status",
  "data": {
    "gameId": "uuid"
  }
}
```

### Server to Client Messages

#### Login Success
```json
{
  "type": "login_success",
  "data": {
    "userId": "uuid",
    "username": "string"
  }
}
```

#### Login Error
```json
{
  "type": "login_error",
  "data": {
    "message": "string"
  }
}
```

#### Room Joined
```json
{
  "type": "room_joined",
  "data": {
    "roomId": "uuid",
    "players": ["uuid"],
    "roomName": "string"
  }
}
```

#### Room Left
```json
{
  "type": "room_left",
  "data": {
    "roomId": "uuid"
  }
}
```

#### Game Started
```json
{
  "type": "game_started",
  "data": {
    "gameId": "uuid",
    "players": ["uuid"],
    "currentPlayer": "uuid",
    "round": 1,
    "maxRounds": 3
  }
}
```

#### Move Made
```json
{
  "type": "move_made",
  "data": {
    "gameId": "uuid",
    "player": "uuid",
    "move": "rock|paper|scissors",
    "currentPlayer": "uuid"
  }
}
```

#### Round Ended
```json
{
  "type": "round_ended",
  "data": {
    "gameId": "uuid",
    "round": 1,
    "result": {
      "round": 1,
      "moves": {
        "uuid": "rock|paper|scissors"
      },
      "result": {
        "winner": "player1|player2|null",
        "result": "win|lose|draw"
      }
    },
    "nextRound": 2,
    "currentPlayer": "uuid"
  }
}
```

#### Game Ended
```json
{
  "type": "game_ended",
  "data": {
    "gameId": "uuid",
    "winner": "uuid|null",
    "rounds": [
      {
        "round": 1,
        "moves": {
          "uuid": "rock|paper|scissors"
        },
        "result": {
          "winner": "player1|player2|null",
          "result": "win|lose|draw"
        }
      }
    ],
    "finalScore": {
      "player1": 1,
      "player2": 2
    }
  }
}
```

#### Player Joined
```json
{
  "type": "player_joined",
  "data": {
    "roomId": "uuid",
    "playerId": "uuid"
  }
}
```

#### Player Left
```json
{
  "type": "player_left",
  "data": {
    "roomId": "uuid",
    "playerId": "uuid"
  }
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "message": "string"
  }
}
```

## Game Rules

### Rock Paper Scissors
- **Rock** beats **Scissors**
- **Paper** beats **Rock**
- **Scissors** beats **Paper**
- Same moves result in a **Draw**

### Game Flow
1. Players join a room (max 2 players)
2. When room is full, game automatically starts
3. Players take turns making moves
4. Game consists of 3 rounds
5. Winner is determined by best of 3 rounds
6. Game ends when all rounds are completed

### Move Types
- `rock` - Rock move
- `paper` - Paper move  
- `scissors` - Scissors move

### Game Status
- `waiting` - Room waiting for players
- `ready` - Room full, game starting
- `active` - Game in progress
- `finished` - Game completed

### Player Status
- `online` - Player is connected
- `offline` - Player is disconnected
- `in_game` - Player is currently in a game
