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
  const USER_SERVICE_URL = 'http://localhost:3001';
  const ROOM_SERVICE_URL = 'http://localhost:3002';
  const GAME_SERVICE_URL = 'http://localhost:3003';
  const WS_URL = 'ws://localhost:3004';

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
    switch (message.type) {
      case 'game_started':
        setCurrentGame(message.data);
        Alert.alert('Game Started!', 'The game has begun!');
        break;

      case 'move_made':
        Alert.alert('Move Made', `${message.data.player === userId ? 'You' : 'Opponent'} made a move`);
        break;

      case 'round_ended':
        Alert.alert('Round Ended', `Round ${message.data.round} completed!`);
        break;

      case 'game_ended':
        const winner = message.data.winner === userId ? 'You Won!' : 
                      message.data.winner ? 'Opponent Won!' : 'Draw!';
        Alert.alert('Game Ended', `Winner: ${winner}`);
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
      Alert.alert('Success', `Move made: ${move}`);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Render Components
  const renderAuthScreen = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Game System</Title>
          <Paragraph style={styles.subtitle}>Rock Paper Scissors</Paragraph>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={login} style={styles.button}>
              Login
            </Button>
            <Button mode="outlined" onPress={register} style={styles.button}>
              Register
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderGameScreen = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Welcome, {username}!</Title>
          <Paragraph>Connection: {wsConnected ? 'Connected' : 'Disconnected'}</Paragraph>
          
          <Button mode="contained" onPress={logout} style={styles.button}>
            Logout
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Room Management</Title>
          
          <Button mode="contained" onPress={createRoom} style={styles.button}>
            Create Room
          </Button>
          
          <Button mode="outlined" onPress={listRooms} style={styles.button}>
            List Rooms
          </Button>
          
          {currentRoom && (
            <View style={styles.roomInfo}>
              <Paragraph>Current Room: {currentRoom.name}</Paragraph>
              <Paragraph>Players: {currentRoom.players.length}/{currentRoom.maxPlayers}</Paragraph>
              <Button mode="outlined" onPress={leaveRoom} style={styles.button}>
                Leave Room
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {rooms.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Available Rooms</Title>
            {rooms.map((room, index) => (
              <TouchableOpacity
                key={index}
                style={styles.roomItem}
                onPress={() => joinRoom(room.id)}
              >
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomInfo}>
                  {room.playerCount}/{room.maxPlayers} players - {room.status}
                </Text>
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>
      )}

      {currentGame && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Game</Title>
            <Paragraph>Round: {currentGame.round}/{currentGame.maxRounds}</Paragraph>
            <Paragraph>
              Current Player: {currentGame.currentPlayer === userId ? 'You' : 'Opponent'}
            </Paragraph>
            
            {currentGame.currentPlayer === userId && (
              <View style={styles.moveButtons}>
                <Button mode="contained" onPress={() => makeMove('rock')} style={styles.moveButton}>
                  Rock
                </Button>
                <Button mode="contained" onPress={() => makeMove('paper')} style={styles.moveButton}>
                  Paper
                </Button>
                <Button mode="contained" onPress={() => makeMove('scissors')} style={styles.moveButton}>
                  Scissors
                </Button>
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
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        {isLoggedIn ? renderGameScreen() : renderAuthScreen()}
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    marginVertical: 8,
  },
  roomInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  roomItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  moveButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  moveButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default App;
