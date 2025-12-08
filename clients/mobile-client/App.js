import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { PaperProvider, Card, Title, Paragraph, Button, FAB } from 'react-native-paper';
import WebSocket from 'react-native-websocket';

const App = () => {
  // State management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [ws, setWs] = useState(null);

  // Service URLs
  // For Android Emulator: use '10.0.2.2' instead of 'localhost'
  // For Physical Device: use your computer's IP address
  // For iOS Simulator: 'localhost' works fine
  // Update this IP to match your computer's IP address when using a physical device
  const COMPUTER_IP = '10.65.193.139'; // Your laptop's IP address - update if needed
  const API_BASE = __DEV__ ? `http://${COMPUTER_IP}` : 'http://localhost'; // Use IP for physical device
  const WS_BASE = __DEV__ ? `ws://${COMPUTER_IP}` : 'ws://localhost';
  
  const USER_SERVICE_URL = `${API_BASE}:3001`;
  const ROOM_SERVICE_URL = `${API_BASE}:3002`;
  const GAME_SERVICE_URL = `${API_BASE}:3003`;
  const WS_URL = `${WS_BASE}:3004`;

  // API Helper
  const apiCall = async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      return await response.json();
    } catch (error) {
      Alert.alert('Error', error.message);
      return { success: false, error: error.message };
    }
  };

  // Authentication
  const register = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await apiCall(`${USER_SERVICE_URL}/api/users/register`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.success) {
      Alert.alert('Success', 'Registration successful! Please login.');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const login = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await apiCall(`${USER_SERVICE_URL}/api/users/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.success) {
      setUserId(result.user.id);
      setSessionId(result.sessionId);
      setIsLoggedIn(true);
      connectWebSocket(result.user.id);
      Alert.alert('Success', `Welcome ${result.user.username}!`);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const logout = async () => {
    if (sessionId) {
      await apiCall(`${USER_SERVICE_URL}/api/users/logout`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
    }

    if (ws) {
      ws.close();
    }

    setUserId(null);
    setSessionId(null);
    setIsLoggedIn(false);
    setCurrentRoom(null);
    setCurrentGame(null);
    setWsConnected(false);
  };

  // WebSocket Connection
  const connectWebSocket = (userId) => {
    const websocket = new WebSocket(`${WS_URL}?userId=${userId}`);
    
    websocket.onopen = () => {
      setWsConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    websocket.onclose = () => {
      setWsConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleWebSocketMessage = (message) => {
    // Update game state from message
    if (message.data) {
      setCurrentGame(prev => {
        if (!prev && message.type === 'game_started') {
          return message.data;
        }
        if (prev) {
          return {
            ...prev,
            gameId: message.data.gameId || prev.gameId,
            currentPlayer: message.data.currentPlayer !== undefined ? message.data.currentPlayer : prev.currentPlayer,
            round: message.data.round || message.data.nextRound || prev.round,
            maxRounds: message.data.maxRounds || prev.maxRounds,
            players: message.data.players || prev.players
          };
        }
        return prev;
      });
    }

    switch (message.type) {
      case 'game_started':
        Alert.alert(
          'GAME STARTED!', 
          `Round ${message.data.round}/${message.data.maxRounds}\n\n${message.data.currentPlayer === userId ? 'You go first!' : 'Waiting for opponent...'}`
        );
        break;

      case 'move_made':
        if (message.data.currentPlayer === userId) {
          Alert.alert('YOUR TURN NOW!', 'Opponent made their move. It\'s your turn!');
        } else {
          Alert.alert('Move Made', 'Opponent is making their move...');
        }
        break;

      case 'round_ended':
        const roundResult = message.data.result;
        let resultText = `Round ${message.data.round} Results:\n\n`;
        
        if (roundResult && roundResult.moves) {
          const moves = roundResult.moves;
          const playerIds = Object.keys(moves);
          if (playerIds.length >= 2) {
            const p1Id = playerIds[0];
            const p2Id = playerIds[1];
            const p1IsMe = p1Id === userId;
            resultText += `${p1IsMe ? 'You' : 'Opponent'}: ${moves[p1Id].toUpperCase()}\n`;
            resultText += `${p1IsMe ? 'Opponent' : 'You'}: ${moves[p2Id].toUpperCase()}\n\n`;
          }
        }
        
        if (roundResult && roundResult.result) {
          const result = roundResult.result;
          if (result.winner === 'player1') {
            const winnerId = currentGame?.players?.[0];
            resultText += winnerId === userId ? 'YOU WON THIS ROUND!' : 'Opponent won this round';
          } else if (result.winner === 'player2') {
            const winnerId = currentGame?.players?.[1];
            resultText += winnerId === userId ? 'YOU WON THIS ROUND!' : 'Opponent won this round';
          } else {
            resultText += 'DRAW - Same move!';
          }
        }
        
        if (message.data.nextRound <= (currentGame?.maxRounds || 3)) {
          resultText += `\n\nNext Round: ${message.data.nextRound}/${currentGame?.maxRounds || 3}`;
          if (message.data.currentPlayer === userId) {
            resultText += '\nIt\'s your turn to start!';
          } else {
            resultText += '\nWaiting for opponent...';
          }
        }
        
        Alert.alert('=== ROUND ENDED ===', resultText);
        break;

      case 'game_ended':
        let endText = 'GAME ENDED!\n\n';
        if (message.data.winner === userId) {
          endText += 'YOU WON THE GAME!';
        } else if (message.data.winner) {
          endText += 'Opponent won the game';
        } else {
          endText += 'The game ended in a DRAW!';
        }
        
        if (message.data.finalScore) {
          const p1Score = message.data.finalScore.player1 || 0;
          const p2Score = message.data.finalScore.player2 || 0;
          const p1IsMe = currentGame?.players?.[0] === userId;
          endText += `\n\nFinal Score:\n${p1IsMe ? 'You' : 'Opponent'}: ${p1Score} rounds\n${p1IsMe ? 'Opponent' : 'You'}: ${p2Score} rounds`;
        }
        
        Alert.alert('Game Ended', endText);
        setCurrentGame(null);
        break;

      case 'player_joined':
        Alert.alert('Player Joined', 'A player joined the room');
        break;

      case 'player_left':
        Alert.alert('Player Left', 'A player left the room');
        break;

      case 'error':
        Alert.alert('Game Error', message.data.message);
        break;
    }
  };

  // Room Management
  const createRoom = async () => {
    const result = await apiCall(`${ROOM_SERVICE_URL}/api/rooms`, {
      method: 'POST',
      body: JSON.stringify({ hostUserId: userId }),
    });

    if (result.success) {
      setCurrentRoom(result.room);
      Alert.alert('Success', `Room created: ${result.room.name}`);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const joinRoom = async (roomId) => {
    const result = await apiCall(`${ROOM_SERVICE_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    if (result.success) {
      setCurrentRoom(result.room);
      Alert.alert('Success', `Joined room: ${result.room.name}`);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const listRooms = async () => {
    const result = await apiCall(`${ROOM_SERVICE_URL}/api/rooms`);
    
    if (result.success) {
      setRooms(result.rooms);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom) {
      Alert.alert('Error', 'You are not in any room');
      return;
    }

    const result = await apiCall(`${ROOM_SERVICE_URL}/api/rooms/${currentRoom.id}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    if (result.success) {
      setCurrentRoom(null);
      setCurrentGame(null);
      Alert.alert('Success', 'Left room successfully');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Game Actions
  const makeMove = async (move) => {
    if (!currentGame) {
      Alert.alert('Error', 'No active game');
      return;
    }

    const result = await apiCall(`${GAME_SERVICE_URL}/api/game/move`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        gameId: currentGame.gameId,
        move,
      }),
    });

    if (result.success) {
      Alert.alert('Success', `Move made: ${move.toUpperCase()}\n\nWaiting for opponent...`);
      // Update game state if provided
      if (result.game) {
        setCurrentGame({
          gameId: result.game.id,
          players: result.game.players,
          currentPlayer: result.game.currentPlayer,
          round: result.game.currentRound,
          maxRounds: result.game.maxRounds
        });
      }
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Render Components
  const renderAuthScreen = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.mainTitle}>ELITE GAMES</Text>
        <Text style={styles.mainSubtitle}>Rock Paper Scissors</Text>
        <View style={styles.divider} />
      </View>
      
      <Card style={styles.luxuryCard}>
        <Card.Content>
          <TextInput
            style={styles.luxuryInput}
            placeholder="Username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
          />
          
          <TextInput
            style={styles.luxuryInput}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={login}>
              <Text style={styles.primaryButtonText}>LOGIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={register}>
              <Text style={styles.secondaryButtonText}>REGISTER</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderGameScreen = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.gameContainer}>
      <View style={styles.headerSection}>
        <Text style={styles.welcomeText}>Welcome, {username}!</Text>
        <View style={[styles.statusIndicator, wsConnected ? styles.statusConnected : styles.statusDisconnected]}>
          <View style={[styles.statusDot, wsConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
          <Text style={styles.statusText}>{wsConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.luxuryCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Room Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={createRoom}>
            <Text style={styles.actionButtonText}>Create Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={listRooms}>
            <Text style={styles.actionButtonSecondaryText}>List Rooms</Text>
          </TouchableOpacity>
          
          {currentRoom && (
            <View style={styles.roomInfoCard}>
              <Text style={styles.roomInfoTitle}>Current Room</Text>
              <Text style={styles.roomInfoName}>{currentRoom.name}</Text>
              <Text style={styles.roomInfoPlayers}>
                Players: {currentRoom.players.length}/{currentRoom.maxPlayers}
              </Text>
              <TouchableOpacity style={styles.leaveButton} onPress={leaveRoom}>
                <Text style={styles.leaveButtonText}>Leave Room</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>

      {rooms.length > 0 && (
        <Card style={styles.luxuryCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Available Rooms</Text>
            {rooms.map((room, index) => (
              <TouchableOpacity
                key={index}
                style={styles.roomItemLuxury}
                onPress={() => joinRoom(room.id)}
              >
                <View style={styles.roomItemContent}>
                  <Text style={styles.roomNameLuxury}>{room.name}</Text>
                  <Text style={styles.roomInfoLuxury}>
                    {room.playerCount}/{room.maxPlayers} players • {room.status}
                  </Text>
                </View>
                <Text style={styles.roomArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>
      )}

      {currentGame && (
        <Card style={styles.gameCard}>
          <Card.Content>
            <Text style={styles.gameTitle}>ACTIVE GAME</Text>
            <View style={styles.gameInfoRow}>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoLabel}>Round</Text>
                <Text style={styles.gameInfoValue}>{currentGame.round || 1}/{currentGame.maxRounds || 3}</Text>
              </View>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoLabel}>Best of</Text>
                <Text style={styles.gameInfoValue}>{currentGame.maxRounds || 3}</Text>
              </View>
            </View>
            
            {currentGame.currentPlayer === userId ? (
              <>
                <View style={styles.turnIndicator}>
                  <Text style={styles.turnText}>YOUR TURN NOW!</Text>
                </View>
                <View style={styles.moveButtons}>
                  <TouchableOpacity 
                    style={[styles.moveButtonLuxury, styles.moveButtonRock]} 
                    onPress={() => makeMove('rock')}
                  >
                    <Text style={styles.moveButtonText}>ROCK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.moveButtonLuxury, styles.moveButtonPaper]} 
                    onPress={() => makeMove('paper')}
                  >
                    <Text style={styles.moveButtonText}>PAPER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.moveButtonLuxury, styles.moveButtonScissors]} 
                    onPress={() => makeMove('scissors')}
                  >
                    <Text style={styles.moveButtonText}>SCISSORS</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.waitingIndicator}>
                <Text style={styles.waitingText}>Waiting for opponent...</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {isLoggedIn ? renderGameScreen() : renderAuthScreen()}
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep navy background
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  gameContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FCD34D', // Gold
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(252, 211, 77, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  mainSubtitle: {
    fontSize: 20,
    color: '#E2E8F0',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#FCD34D',
    marginTop: 16,
    borderRadius: 2,
  },
  luxuryCard: {
    margin: 0,
    borderRadius: 20,
    backgroundColor: '#1E293B', // Dark slate
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  luxuryInput: {
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#0F172A',
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6', // Purple - matches web
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06B6D4', // Cyan
  },
  secondaryButtonText: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: '#22C55E',
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutButtonText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  actionButton: {
    backgroundColor: '#06B6D4', // Cyan - matches web
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981', // Green
  },
  actionButtonSecondaryText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roomInfoCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roomInfoTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  roomInfoName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 8,
  },
  roomInfoPlayers: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 12,
  },
  leaveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  leaveButtonText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
  },
  roomItemLuxury: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roomItemContent: {
    flex: 1,
  },
  roomNameLuxury: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FCD34D',
    marginBottom: 4,
  },
  roomInfoLuxury: {
    fontSize: 14,
    color: '#94A3B8',
  },
  roomArrow: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  gameCard: {
    margin: 0,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FCD34D',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  gameInfoItem: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gameInfoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  gameInfoValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366F1',
  },
  turnIndicator: {
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FCD34D',
    alignItems: 'center',
  },
  turnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 1,
  },
  waitingIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  moveButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  moveButtonLuxury: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginHorizontal: 6,
  },
  moveButtonRock: {
    backgroundColor: '#F59E0B', // Orange - matches web
    shadowColor: '#F59E0B',
  },
  moveButtonPaper: {
    backgroundColor: '#3B82F6', // Blue - matches web
    shadowColor: '#3B82F6',
  },
  moveButtonScissors: {
    backgroundColor: '#10B981', // Green - matches web
    shadowColor: '#10B981',
  },
  moveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default App;
