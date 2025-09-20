const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');

/**
 * Socket.IO Manager for The Kitchen Game
 * Handles real-time communication between players
 */
class SocketManager {
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Set up all Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
      
      // Handle user disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // Log successful connection
      socket.emit('connected', {
        message: 'Successfully connected to The Kitchen server',
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle user disconnection
   * @param {Object} socket - The disconnected socket
   */
  async handleDisconnect(socket) {
    try {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find and remove player from any room they were in
      const player = await Player.findOne({ socketId: socket.id });
      
      if (player) {
        console.log(`Removing player ${player.name} (${socket.id}) from rooms`);
        
        // Find rooms containing this player
        const rooms = await GameRoom.find({ 
          players: player._id 
        }).populate('players');
        
        for (const room of rooms) {
          // Remove player from room
          await room.removePlayer(player._id);
          
          // If room becomes empty, delete it
          if (room.players.length === 0) {
            console.log(`Deleting empty room: ${room.roomCode}`);
            await GameRoom.findByIdAndDelete(room._id);
          } else {
            // Notify remaining players about the disconnection
            this.io.to(room.roomCode).emit('playerLeft', {
              playerId: player._id,
              playerName: player.name,
              message: `${player.name} has left the room`,
              remainingPlayers: room.players.length
            });
          }
        }
        
        // Delete the player record
        await Player.findByIdAndDelete(player._id);
        console.log(`Player ${player.name} removed from database`);
      }
      
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Get socket instance for external use
   * @returns {Object} Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Emit event to a specific room
   * @param {string} roomCode - The room code
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToRoom(roomCode, event, data) {
    this.io.to(roomCode).emit(event, data);
  }

  /**
   * Emit event to a specific socket
   * @param {string} socketId - The socket ID
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToSocket(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Join a socket to a room
   * @param {string} socketId - The socket ID
   * @param {string} roomCode - The room code
   */
  joinRoom(socketId, roomCode) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomCode);
      console.log(`Socket ${socketId} joined room ${roomCode}`);
    }
  }

  /**
   * Leave a socket from a room
   * @param {string} socketId - The socket ID
   * @param {string} roomCode - The room code
   */
  leaveRoom(socketId, roomCode) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomCode);
      console.log(`Socket ${socketId} left room ${roomCode}`);
    }
  }

  /**
   * Get connected sockets count
   * @returns {number} Number of connected sockets
   */
  getConnectedCount() {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get all connected socket IDs
   * @returns {Array} Array of socket IDs
   */
  getConnectedSockets() {
    return Array.from(this.io.sockets.sockets.keys());
  }
}

module.exports = SocketManager;
