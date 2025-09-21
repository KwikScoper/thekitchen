const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thekitchen');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('Server will continue without database connection for development...');
    // Don't exit the process, allow server to run without DB
  }
};

// Import routes and socket manager
const gameRoutes = require('./routes/gameRoutes');
const SocketManager = require('./socketManager');
const Player = require('./models/player');

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'The Kitchen server is running',
    timestamp: new Date().toISOString()
  });
});

// Use game routes
app.use('/api/room', gameRoutes);

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Socket.IO connection handling (now managed by SocketManager)
// The SocketManager handles all connection/disconnection logic

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Cleanup function to remove orphaned player records
const cleanupOrphanedPlayers = async () => {
  try {
    const result = await Player.deleteMany({});
    console.log(`Cleaned up ${result.deletedCount} orphaned player records`);
  } catch (error) {
    console.error('Error cleaning up player records:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    // Clean up orphaned player records on server startup
    await cleanupOrphanedPlayers();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer();

module.exports = { app, server, io, socketManager };
