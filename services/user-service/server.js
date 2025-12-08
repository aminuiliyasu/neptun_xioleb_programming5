const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const users = new Map(); // userId -> user data
const userSessions = new Map(); // sessionId -> userId

// User Service - User Management
class UserService {
  constructor() {
    this.users = users;
    this.sessions = userSessions;
  }

  // Register a new user
  register(username, password) {
    // Check if username already exists
    for (let [userId, user] of this.users) {
      if (user.username === username) {
        return { success: false, error: 'Username already exists' };
      }
    }

    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      password, // In production, this should be hashed
      createdAt: new Date(),
      status: 'offline'
    };

    this.users.set(userId, user);
    return { success: true, user: { id: user.id, username: user.username } };
  }

  // Login user
  login(username, password) {
    for (let [userId, user] of this.users) {
      if (user.username === username && user.password === password) {
        user.status = 'online';
        const sessionId = uuidv4();
        this.sessions.set(sessionId, userId);
        return { 
          success: true, 
          sessionId,
          user: { id: user.id, username: user.username }
        };
      }
    }
    return { success: false, error: 'Invalid credentials' };
  }

  // Get user by ID
  getUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    return { success: true, user: { id: user.id, username: user.username, status: user.status } };
  }

  // Get user by session
  getUserBySession(sessionId) {
    const userId = this.sessions.get(sessionId);
    if (!userId) {
      return { success: false, error: 'Invalid session' };
    }
    return this.getUser(userId);
  }

  // Get all users
  getAllUsers() {
    const userList = Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      status: user.status
    }));
    return { success: true, users: userList };
  }

  // Logout user
  logout(sessionId) {
    const userId = this.sessions.get(sessionId);
    if (userId) {
      const user = this.users.get(userId);
      if (user) {
        user.status = 'offline';
      }
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false, error: 'Invalid session' };
  }
}

const userService = new UserService();

// API Routes

// Register new user
app.post('/api/users/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  const result = userService.register(username, password);
  
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

// Login user
app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  const result = userService.login(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

// Get user by ID
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const result = userService.getUser(userId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  const result = userService.getAllUsers();
  res.json(result);
});

// Logout user
app.post('/api/users/logout', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }

  const result = userService.logout(sessionId);
  res.json(result);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'User Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    users: userService.users.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { UserService, userService };
