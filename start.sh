#!/bin/bash

# Distributed Game System - Startup Script
echo "Starting Distributed Game System..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "WARNING: Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check if ports are available
echo "Checking port availability..."
check_port 3001 || { echo "ERROR: Port 3001 (User Service) is in use"; exit 1; }
check_port 3002 || { echo "ERROR: Port 3002 (Room Service) is in use"; exit 1; }
check_port 3003 || { echo "ERROR: Port 3003 (Game Service) is in use"; exit 1; }
check_port 3004 || { echo "ERROR: Port 3004 (WebSocket) is in use"; exit 1; }

echo "All ports are available"

# Start services in background
echo "Starting microservices..."

# Start User Service
echo "Starting User Service (port 3001)..."
cd services/user-service && npm start &
USER_PID=$!

# Start Room Service  
echo "Starting Room Service (port 3002)..."
cd ../room-service && npm start &
ROOM_PID=$!

# Start Game Service
echo "Starting Game Service (port 3003)..."
cd ../game-service && npm start &
GAME_PID=$!

# Wait a moment for services to start
sleep 3

# Check if services are running
echo "Checking service health..."

# Check User Service
if curl -s http://localhost:3001/health > /dev/null; then
    echo "SUCCESS: User Service is running"
else
    echo "ERROR: User Service failed to start"
fi

# Check Room Service
if curl -s http://localhost:3002/health > /dev/null; then
    echo "SUCCESS: Room Service is running"
else
    echo "ERROR: Room Service failed to start"
fi

# Check Game Service
if curl -s http://localhost:3003/health > /dev/null; then
    echo "SUCCESS: Game Service is running"
else
    echo "ERROR: Game Service failed to start"
fi

echo ""
echo "All services are running!"
echo ""
echo "Client Applications:"
echo "   CLI Client:    cd clients/cli-client && npm start"
echo "   Web Client:    cd clients/web-client && npm start"
echo "   Mobile Client: cd clients/mobile-client && npm start"
echo ""
echo "Service URLs:"
echo "   User Service:  http://localhost:3001"
echo "   Room Service:  http://localhost:3002"
echo "   Game Service:  http://localhost:3003"
echo "   WebSocket:     ws://localhost:3004"
echo ""
echo "Documentation: docs/PRESENTATION_GUIDE.md"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $USER_PID $ROOM_PID $GAME_PID 2>/dev/null
    echo "Services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
