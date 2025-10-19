// Web Client for Distributed Game System
class WebGameClient {
    constructor() {
        this.userId = null;
        this.sessionId = null;
        this.username = null;
        this.currentRoom = null;
        this.currentGame = null;
        this.ws = null;
        
        // Service URLs
        this.USER_SERVICE_URL = 'http://localhost:3001';
        this.ROOM_SERVICE_URL = 'http://localhost:3002';
        this.GAME_SERVICE_URL = 'http://localhost:3003';
        this.WS_URL = 'ws://localhost:3004';
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Auth tab switching
        document.getElementById('login-tab').addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('register-tab').addEventListener('click', () => this.switchAuthTab('register'));
        
        // Auth forms
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        
        // Game controls
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('list-rooms-btn').addEventListener('click', () => this.listRooms());
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Move buttons
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.makeMove(e.target.dataset.move));
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        
        document.getElementById(`${tab}-tab`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.remove('hidden');
    }

    showMessage(message, type = 'info') {
        const statusDiv = document.getElementById('status-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;
        
        statusDiv.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    async register() {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.USER_SERVICE_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('Registration successful! Please login.', 'success');
                this.switchAuthTab('login');
            } else {
                this.showMessage(`Registration failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Registration error: ${error.message}`, 'error');
        }
    }

    async login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.USER_SERVICE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.userId = data.user.id;
                this.sessionId = data.sessionId;
                this.username = data.user.username;
                
                this.showMessage(`Welcome ${this.username}!`, 'success');
                this.showGameSection();
            } else {
                this.showMessage(`Login failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Login error: ${error.message}`, 'error');
        }
    }

    showGameSection() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('game-section').classList.remove('hidden');
        document.getElementById('welcome-message').textContent = `Welcome, ${this.username}!`;
    }

    async createRoom() {
        const roomName = document.getElementById('room-name').value;

        try {
            const response = await fetch(`${this.ROOM_SERVICE_URL}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    hostUserId: this.userId, 
                    roomName: roomName || undefined 
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentRoom = data.room;
                this.showMessage(`Room created: ${this.currentRoom.name}`, 'success');
                this.updateRoomDisplay();
                this.connectWebSocket();
            } else {
                this.showMessage(`Room creation failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Room creation error: ${error.message}`, 'error');
        }
    }

    async joinRoom() {
        const roomId = document.getElementById('join-room-id').value;
        
        if (!roomId) {
            this.showMessage('Please enter a room ID', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.ROOM_SERVICE_URL}/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentRoom = data.room;
                this.showMessage(`Joined room: ${this.currentRoom.name}`, 'success');
                this.updateRoomDisplay();
                this.connectWebSocket();
            } else {
                this.showMessage(`Join room failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Join room error: ${error.message}`, 'error');
        }
    }

    async listRooms() {
        try {
            const response = await fetch(`${this.ROOM_SERVICE_URL}/api/rooms`);
            const data = await response.json();
            
            if (data.success) {
                this.displayRooms(data.rooms);
            } else {
                this.showMessage(`Failed to list rooms: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`List rooms error: ${error.message}`, 'error');
        }
    }

    displayRooms(rooms) {
        const roomsList = document.getElementById('rooms-list');
        const roomsContainer = document.getElementById('rooms-container');
        
        roomsContainer.innerHTML = '';
        
        if (rooms.length === 0) {
            roomsContainer.innerHTML = '<p>No rooms available</p>';
        } else {
            rooms.forEach(room => {
                const roomDiv = document.createElement('div');
                roomDiv.className = 'room-item';
                roomDiv.innerHTML = `
                    <div>
                        <strong>${room.name}</strong><br>
                        <small>${room.playerCount}/${room.maxPlayers} players - ${room.status}</small>
                    </div>
                    <button onclick="webClient.joinRoomById('${room.id}')">Join</button>
                `;
                roomsContainer.appendChild(roomDiv);
            });
        }
        
        roomsList.classList.remove('hidden');
    }

    async joinRoomById(roomId) {
        document.getElementById('join-room-id').value = roomId;
        await this.joinRoom();
    }

    async leaveRoom() {
        if (!this.currentRoom) {
            this.showMessage('You are not in any room', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.ROOM_SERVICE_URL}/api/rooms/${this.currentRoom.id}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('Left room successfully', 'success');
                this.currentRoom = null;
                this.currentGame = null;
                this.updateRoomDisplay();
                
                if (this.ws) {
                    this.ws.close();
                    this.ws = null;
                }
            } else {
                this.showMessage(`Leave room failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Leave room error: ${error.message}`, 'error');
        }
    }

    updateRoomDisplay() {
        const currentRoomDiv = document.getElementById('current-room');
        const roomInfo = document.getElementById('room-info');
        const roomPlayers = document.getElementById('room-players');
        const leaveBtn = document.getElementById('leave-room-btn');
        
        if (this.currentRoom) {
            roomInfo.innerHTML = `
                <strong>${this.currentRoom.name}</strong><br>
                <small>ID: ${this.currentRoom.id}</small><br>
                <small>Status: ${this.currentRoom.status}</small>
            `;
            
            roomPlayers.innerHTML = `
                <strong>Players (${this.currentRoom.players.length}/${this.currentRoom.maxPlayers}):</strong><br>
                ${this.currentRoom.players.map(playerId => 
                    `<span class="player">${playerId === this.userId ? 'You' : 'Player'}</span>`
                ).join(', ')}
            `;
            
            currentRoomDiv.classList.remove('hidden');
            leaveBtn.classList.remove('hidden');
        } else {
            currentRoomDiv.classList.add('hidden');
            leaveBtn.classList.add('hidden');
        }
    }

    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(`${this.WS_URL}?userId=${this.userId}`);

        this.ws.onopen = () => {
            this.showMessage('Connected to game server', 'success');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                this.showMessage(`WebSocket message error: ${error.message}`, 'error');
            }
        };

        this.ws.onclose = () => {
            this.showMessage('Disconnected from game server', 'warning');
        };

        this.ws.onerror = (error) => {
            this.showMessage(`WebSocket error: ${error.message}`, 'error');
        };
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'game_started':
                this.currentGame = message.data;
                this.showMessage('Game Started!', 'success');
                this.updateGameDisplay();
                break;

            case 'move_made':
                this.showMessage(`${message.data.player === this.userId ? 'You' : 'Opponent'} made a move`, 'info');
                this.updateGameDisplay();
                break;

            case 'round_ended':
                this.showMessage(`Round ${message.data.round} ended!`, 'info');
                this.updateGameDisplay();
                break;

            case 'game_ended':
                this.showMessage(`Game ended! Winner: ${message.data.winner === this.userId ? 'You Won!' : message.data.winner ? 'Opponent Won!' : 'Draw!'}`, 'success');
                this.currentGame = null;
                this.updateGameDisplay();
                break;

            case 'player_joined':
                this.showMessage('Player joined the room', 'info');
                this.updateRoomDisplay();
                break;

            case 'player_left':
                this.showMessage('Player left the room', 'warning');
                this.updateRoomDisplay();
                break;

            case 'error':
                this.showMessage(`Game error: ${message.data.message}`, 'error');
                break;
        }
    }

    updateGameDisplay() {
        const gameArea = document.getElementById('game-area');
        const gameInfo = document.getElementById('game-info');
        const gameStatus = document.getElementById('game-status');
        const moveButtons = document.getElementById('move-buttons');
        
        if (this.currentGame) {
            gameInfo.innerHTML = `
                <div><strong>Game ID:</strong> ${this.currentGame.gameId}</div>
                <div><strong>Round:</strong> ${this.currentGame.round}/${this.currentGame.maxRounds}</div>
                <div><strong>Players:</strong> ${this.currentGame.players.join(', ')}</div>
            `;
            
            const isMyTurn = this.currentGame.currentPlayer === this.userId;
            gameStatus.innerHTML = isMyTurn ? 
                '<div style="color: #28a745;">Your turn!</div>' : 
                '<div style="color: #ffc107;">Waiting for opponent...</div>';
            
            moveButtons.classList.toggle('hidden', !isMyTurn);
            gameArea.classList.remove('hidden');
        } else {
            gameArea.classList.add('hidden');
        }
    }

    async makeMove(move) {
        if (!this.currentGame) {
            this.showMessage('No active game', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.GAME_SERVICE_URL}/api/game/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    gameId: this.currentGame.gameId,
                    move
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(`Move made: ${move}`, 'success');
            } else {
                this.showMessage(`Move failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(`Move error: ${error.message}`, 'error');
        }
    }

    async logout() {
        try {
            if (this.sessionId) {
                await fetch(`${this.USER_SERVICE_URL}/api/users/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: this.sessionId })
                });
            }
            
            if (this.ws) {
                this.ws.close();
            }
            
            this.userId = null;
            this.sessionId = null;
            this.username = null;
            this.currentRoom = null;
            this.currentGame = null;
            
            this.showMessage('Logged out successfully', 'success');
            this.showAuthSection();
        } catch (error) {
            this.showMessage(`Logout error: ${error.message}`, 'error');
        }
    }

    showAuthSection() {
        document.getElementById('game-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('rooms-list').classList.add('hidden');
    }
}

// Initialize the web client
const webClient = new WebGameClient();
