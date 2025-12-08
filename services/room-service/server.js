const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const rooms = new Map(); // roomId -> room data
const userRooms = new Map(); // userId -> roomId

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3003';

// Room Service - Room Management
class RoomService {
  constructor() {
    this.rooms = rooms;
    this.userRooms = userRooms;
  }

  // Create a new room
  createRoom(hostUserId, roomName) {
    const roomId = uuidv4();
    const room = {
      id: roomId,
      name: roomName || `Room ${roomId.substring(0, 8)}`,
      hostId: hostUserId,
      players: [hostUserId],
      maxPlayers: 2,
      status: 'waiting',
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    this.userRooms.set(hostUserId, roomId);
    
    return { success: true, room };
  }

  // Join a room
  async joinRoom(userId, roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.players.includes(userId)) {
      return { success: false, error: 'Already in room' };
    }

    // Verify user exists
    try {
      const userResponse = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      if (!userResponse.data.success) {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to verify user' };
    }

    room.players.push(userId);
    this.userRooms.set(userId, roomId);

    // If room is now full, start the game
    if (room.players.length === room.maxPlayers) {
      room.status = 'ready';
      // Notify game service to start game
      try {
        await axios.post(`${GAME_SERVICE_URL}/api/game/start`, {
          roomId,
          players: room.players
        });
        room.status = 'active';
      } catch (error) {
        console.error('Failed to start game:', error.message);
      }
    }

    return { success: true, room };
  }

  // Leave a room
  leaveRoom(userId) {
    const roomId = this.userRooms.get(userId);
    
    if (!roomId) {
      return { success: false, error: 'User not in any room' };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.players = room.players.filter(id => id !== userId);
    this.userRooms.delete(userId);

    // If room becomes empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else {
      // If host left, assign new host
      if (room.hostId === userId) {
        room.hostId = room.players[0];
      }
      room.status = 'waiting';
    }

    return { success: true, room };
  }

  // Get room details
  getRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    return { success: true, room };
  }

  // Get all rooms
  getAllRooms() {
    const roomList = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      createdAt: room.createdAt
    }));
    return { success: true, rooms: roomList };
  }

  // Get user's current room
  getUserRoom(userId) {
    const roomId = this.userRooms.get(userId);
    if (!roomId) {
      return { success: false, error: 'User not in any room' };
    }
    return this.getRoom(roomId);
  }
}

const roomService = new RoomService();

// API Routes

// Create new room
app.post('/api/rooms', async (req, res) => {
  const { hostUserId, roomName } = req.body;
  
  if (!hostUserId) {
    return res.status(400).json({ success: false, error: 'Host user ID required' });
  }

  // Verify user exists
  try {
    const userResponse = await axios.get(`${USER_SERVICE_URL}/api/users/${hostUserId}`);
    if (!userResponse.data.success) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to verify user' });
  }

  const result = roomService.createRoom(hostUserId, roomName);
  res.status(201).json(result);
});

// Join room
app.post('/api/rooms/:roomId/join', async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  const result = await roomService.joinRoom(userId, roomId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Leave room
app.post('/api/rooms/:roomId/leave', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  const result = roomService.leaveRoom(userId);
  res.json(result);
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const result = roomService.getRoom(roomId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const result = roomService.getAllRooms();
  res.json(result);
});

// Get user's current room
app.get('/api/rooms/user/:userId', (req, res) => {
  const { userId } = req.params;
  const result = roomService.getUserRoom(userId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Room Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: roomService.rooms.size,
    activeUsers: roomService.userRooms.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Room Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { RoomService, roomService };
