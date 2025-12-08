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

    async checkForActiveGame() {
        // Check if there's an active game for this user
        try {
            const response = await fetch(`${this.GAME_SERVICE_URL}/api/game/player/${this.userId}`);
            const data = await response.json();
            
            if (data.success && data.game) {
                const game = data.game;
                if (game.status === 'active') {
                    // Restore game state
                    this.currentGame = {
                        gameId: game.id,
                        players: game.players,
                        currentPlayer: game.currentPlayer,
                        round: game.currentRound,
                        maxRounds: game.maxRounds
                    };
                    
                    this.showMessage('=== GAME IN PROGRESS ===', 'info');
                    this.showMessage(`Round ${game.currentRound}/${game.maxRounds}`, 'info');
                    this.showMessage(`Current Player: ${game.currentPlayer === this.userId ? 'You' : 'Opponent'}`, 'info');
                    
                    this.updateGameDisplay();
                }
            }
        } catch (error) {
            // No active game, that's fine
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
            // Check if we're already in a room with an active game
            if (this.currentRoom) {
                setTimeout(() => {
                    this.checkForActiveGame();
                }, 500);
            }
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
                // Initialize game state completely
                this.currentGame = {
                    gameId: message.data.gameId,
                    players: message.data.players || [],
                    currentPlayer: message.data.currentPlayer,
                    round: message.data.round || 1,
                    maxRounds: message.data.maxRounds || 3
                };
                this.showMessage('GAME STARTED! Round ' + message.data.round + '/' + message.data.maxRounds, 'success');
                if (message.data.currentPlayer === this.userId) {
                    this.showMessage('You go first!', 'info');
                } else {
                    this.showMessage('Waiting for opponent to make the first move...', 'info');
                }
                // Force UI update
                setTimeout(() => this.updateGameDisplay(), 100);
                break;

            case 'move_made':
                console.log('[WebClient] move_made received:', message.data);
                // CRITICAL: Update game state immediately
                if (!this.currentGame) {
                    // Game state might not be set yet, initialize it
                    this.currentGame = {
                        gameId: message.data.gameId,
                        players: [],
                        currentPlayer: message.data.currentPlayer,
                        round: 1,
                        maxRounds: 3
                    };
                } else {
                    // Update existing game state
                    if (message.data.gameId) this.currentGame.gameId = message.data.gameId;
                    if (message.data.currentPlayer !== undefined) {
                        this.currentGame.currentPlayer = message.data.currentPlayer;
                    }
                }
                
                console.log('[WebClient] Updated game state, currentPlayer:', this.currentGame.currentPlayer, 'userId:', this.userId);
                
                if (message.data.currentPlayer === this.userId) {
                    // It's YOUR turn now - show immediately and enable buttons
                    this.showMessage('YOUR TURN NOW! Opponent made their move', 'success');
                    // Force immediate UI update - call twice to ensure it works
                    this.updateGameDisplay();
                    setTimeout(() => {
                        this.updateGameDisplay();
                        // Scroll to make sure buttons are visible
                        const gameArea = document.getElementById('game-area');
                        if (gameArea) {
                            gameArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 50);
                } else {
                    this.showMessage('Opponent is making their move...', 'info');
                    // Update UI to show waiting state
                    this.updateGameDisplay();
                }
                break;

            case 'round_ended':
                const roundResult = message.data.result;
                let resultMessage = `Round ${message.data.round} Results:\n`;
                
                if (roundResult && roundResult.moves) {
                    const moves = roundResult.moves;
                    const playerIds = Object.keys(moves);
                    if (playerIds.length >= 2) {
                        const p1Id = playerIds[0];
                        const p2Id = playerIds[1];
                        const p1IsMe = p1Id === this.userId;
                        resultMessage += `${p1IsMe ? 'You' : 'Opponent'}: ${moves[p1Id].toUpperCase()}\n`;
                        resultMessage += `${p1IsMe ? 'Opponent' : 'You'}: ${moves[p2Id].toUpperCase()}\n`;
                    }
                }
                
                if (roundResult && roundResult.result) {
                    const result = roundResult.result;
                    if (result.winner === 'player1') {
                        const winnerId = this.currentGame?.players?.[0];
                        resultMessage += winnerId === this.userId ? 'YOU WON THIS ROUND!' : 'Opponent won this round';
                    } else if (result.winner === 'player2') {
                        const winnerId = this.currentGame?.players?.[1];
                        resultMessage += winnerId === this.userId ? 'YOU WON THIS ROUND!' : 'Opponent won this round';
                    } else {
                        resultMessage += 'DRAW - Same move!';
                    }
                }
                
                this.showMessage(resultMessage, 'info');
                
                // Update game state
                if (this.currentGame) {
                    if (message.data.nextRound) {
                        this.currentGame.round = message.data.nextRound;
                    }
                    if (message.data.currentPlayer !== undefined) {
                        this.currentGame.currentPlayer = message.data.currentPlayer;
                    }
                    if (message.data.gameId) {
                        this.currentGame.gameId = message.data.gameId;
                    }
                }
                
                if (message.data.nextRound <= (this.currentGame?.maxRounds || 3)) {
                    if (message.data.currentPlayer === this.userId) {
                        this.showMessage('It\'s your turn to start the next round!', 'success');
                    } else {
                        this.showMessage('Waiting for opponent to start the next round...', 'info');
                    }
                }
                
                // Force UI update after a short delay
                setTimeout(() => this.updateGameDisplay(), 200);
                break;

            case 'game_ended':
                let endMessage = 'GAME ENDED!\n';
                if (message.data.winner === this.userId) {
                    endMessage += 'YOU WON THE GAME!';
                } else if (message.data.winner) {
                    endMessage += 'Opponent won the game';
                } else {
                    endMessage += 'The game ended in a DRAW!';
                }
                
                if (message.data.finalScore) {
                    const p1Score = message.data.finalScore.player1 || 0;
                    const p2Score = message.data.finalScore.player2 || 0;
                    const p1IsMe = this.currentGame?.players?.[0] === this.userId;
                    endMessage += `\nFinal Score:\n${p1IsMe ? 'You' : 'Opponent'}: ${p1Score} rounds won\n${p1IsMe ? 'Opponent' : 'You'}: ${p2Score} rounds won`;
                }
                
                this.showMessage(endMessage, 'success');
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
        
        if (this.currentGame && this.currentGame.gameId) {
            gameInfo.innerHTML = `
                <div><strong>Round:</strong> ${this.currentGame.round || 1}/${this.currentGame.maxRounds || 3}</div>
                <div><strong>Best of ${this.currentGame.maxRounds || 3} rounds</strong></div>
            `;
            
            // Check if it's the player's turn
            const isMyTurn = this.currentGame.currentPlayer === this.userId;
            
            if (isMyTurn) {
                gameStatus.innerHTML = '<div style="color: #28a745; font-weight: bold; font-size: 18px; padding: 10px; background: #d4edda; border-radius: 5px; margin: 10px 0; text-align: center;">YOUR TURN NOW!</div>';
                moveButtons.classList.remove('hidden');
                // Scroll to game area to make it visible
                setTimeout(() => {
                    gameArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            } else {
                gameStatus.innerHTML = '<div style="color: #ffc107; padding: 10px; background: #fff3cd; border-radius: 5px; margin: 10px 0; text-align: center;">Waiting for opponent to make their move...</div>';
                moveButtons.classList.add('hidden');
            }
            
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
                this.showMessage(`Move made: ${move.toUpperCase()}`, 'success');
                // Update game state if provided
                if (data.game) {
                    if (!this.currentGame) {
                        this.currentGame = {};
                    }
                    this.currentGame.gameId = data.game.id;
                    this.currentGame.players = data.game.players;
                    this.currentGame.currentPlayer = data.game.currentPlayer;
                    this.currentGame.round = data.game.currentRound;
                    this.currentGame.maxRounds = data.game.maxRounds;
                }
                this.showMessage('Waiting for opponent to make their move...', 'info');
                // Update display to show waiting state
                setTimeout(() => this.updateGameDisplay(), 100);
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
