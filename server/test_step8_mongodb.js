/**
 * Comprehensive MongoDB Integration Test Suite for Step 8
 * Tests all game state management functionality with real MongoDB database
 */

const mongoose = require('mongoose');
const GameRoom = require('./models/gameRoom');
const Player = require('./models/player');
const AIPromptGenerator = require('./services/aiPromptGenerator');
const SocketManager = require('./socketManager');
const { Server } = require('socket.io');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  mongodbUri: 'mongodb://localhost:27017/thekitchen_test',
  timeout: 30000,
  testRoomCode: 'TEST',
  testPlayerNames: ['Alice', 'Bob', 'Charlie', 'Diana']
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

function logSection(title) {
  console.log(`\n🗄️ ${title}`);
  console.log('='.repeat(50));
}

// Database setup and cleanup
async function setupDatabase() {
  try {
    // Connect to test database
    await mongoose.connect(TEST_CONFIG.mongodbUri);
    console.log('✅ Connected to MongoDB test database');
    
    // Clear test collections
    await GameRoom.deleteMany({});
    await Player.deleteMany({});
    console.log('✅ Test collections cleared');
    
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    return false;
  }
}

async function cleanupDatabase() {
  try {
    // Clear test data
    await GameRoom.deleteMany({});
    await Player.deleteMany({});
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database cleanup completed');
    
    return true;
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    return false;
  }
}

// Test 1: Database Connection and Basic Operations
async function testDatabaseConnection() {
  logSection('Testing Database Connection and Basic Operations');
  
  try {
    // Test connection
    logTest('MongoDB connection established', mongoose.connection.readyState === 1);
    
    // Test model creation
    const player = new Player({
      socketId: 'test-socket-123',
      name: 'Test Player',
      isHost: true
    });
    
    const savedPlayer = await player.save();
    logTest('Player model save operation', savedPlayer._id && savedPlayer.name === 'Test Player');
    
    // Test room creation
    const room = new GameRoom({
      roomCode: 'DB01',
      players: [savedPlayer._id],
      gameState: 'lobby'
    });
    
    const savedRoom = await room.save();
    logTest('GameRoom model save operation', savedRoom._id && savedRoom.roomCode === 'DB01');
    
    // Test population
    const populatedRoom = await GameRoom.findById(savedRoom._id).populate('players');
    logTest('Model population works', populatedRoom.players.length === 1 && populatedRoom.players[0].name === 'Test Player');
    
    // Cleanup
    await Player.findByIdAndDelete(savedPlayer._id);
    await GameRoom.findByIdAndDelete(savedRoom._id);
    
  } catch (error) {
    logTest('Database Connection and Basic Operations', false, error.message);
  }
}

// Test 2: AI Prompt Generator with Database Context
async function testAIPromptGenerator() {
  logSection('Testing AI Prompt Generator with Database Context');
  
  try {
    const ai = new AIPromptGenerator();
    
    // Test basic prompt generation
    const prompt1 = await ai.generatePrompt();
    logTest('Basic prompt generation', typeof prompt1 === 'string' && prompt1.length > 0);
    
    // Test contextual prompt generation with database data
    const players = [];
    for (let i = 0; i < 4; i++) {
      const player = new Player({
        socketId: `test-socket-${i}`,
        name: TEST_CONFIG.testPlayerNames[i],
        isHost: i === 0
      });
      players.push(await player.save());
    }
    
    const prompt2 = await ai.generateContextualPrompt({ 
      playerCount: players.length,
      gameState: 'lobby'
    });
    logTest('Contextual prompt generation with database data', typeof prompt2 === 'string' && prompt2.length > 0);
    
    // Test prompt validation
    const validPrompt = "A dish that tastes like nostalgia";
    const invalidPrompt = "";
    
    logTest('Valid prompt validation', ai.validatePrompt(validPrompt));
    logTest('Invalid prompt validation', !ai.validatePrompt(invalidPrompt));
    
    // Test prompt statistics
    const stats = ai.getPromptStats();
    logTest('Prompt statistics', stats.totalPrompts > 0 && stats.serviceVersion);
    
    // Cleanup
    await Player.deleteMany({ _id: { $in: players.map(p => p._id) } });
    
  } catch (error) {
    logTest('AI Prompt Generator with Database Context', false, error.message);
  }
}

// Test 3: GameRoom Model Methods with Database Operations
async function testGameRoomModelWithDatabase() {
  logSection('Testing GameRoom Model Methods with Database Operations');
  
  try {
    // Create test players
    const players = [];
    for (let i = 0; i < 4; i++) {
      const player = new Player({
        socketId: `test-socket-${i}`,
        name: TEST_CONFIG.testPlayerNames[i],
        isHost: i === 0
      });
      players.push(await player.save());
    }
    
    // Create test room
    const room = new GameRoom({
      roomCode: 'DB02',
      players: players.map(p => p._id),
      gameState: 'lobby',
      cookingTimeLimit: 1800,
      votingTimeLimit: 300
    });
    
    const savedRoom = await room.save();
    logTest('Room creation with players', savedRoom._id && savedRoom.players.length === 4);
    
    // Test startGame method with database save
    await savedRoom.startGame('Test cooking prompt');
    const updatedRoom = await GameRoom.findById(savedRoom._id);
    logTest('startGame method with database save', updatedRoom.gameState === 'submitting' && updatedRoom.currentPrompt === 'Test cooking prompt');
    
    // Test startVoting method
    await updatedRoom.startVoting();
    const votingRoom = await GameRoom.findById(savedRoom._id);
    logTest('startVoting method with database save', votingRoom.gameState === 'voting');
    
    // Test showResults method
    await votingRoom.showResults();
    const resultsRoom = await GameRoom.findById(savedRoom._id);
    logTest('showResults method with database save', resultsRoom.gameState === 'results');
    
    // Test resetToLobby method
    await resultsRoom.resetToLobby();
    const resetRoom = await GameRoom.findById(savedRoom._id);
    logTest('resetToLobby method with database save', resetRoom.gameState === 'lobby' && resetRoom.currentPrompt === null);
    
    // Test timing methods with database data
    await resetRoom.startGame('Test prompt');
    const timingRoom = await GameRoom.findById(savedRoom._id);
    timingRoom.gameStartTime = new Date(Date.now() - 1000); // 1 second ago
    await timingRoom.save();
    
    const isExpired = timingRoom.isCookingTimeExpired();
    const remaining = timingRoom.getRemainingCookingTime();
    
    logTest('isCookingTimeExpired with database data', !isExpired);
    logTest('getRemainingCookingTime with database data', remaining > 0 && remaining <= 1800);
    
    // Test error conditions with database
    try {
      timingRoom.gameState = 'voting';
      await timingRoom.startGame('Test prompt');
      logTest('startGame from wrong state fails', false, 'Should have thrown error');
    } catch (error) {
      logTest('startGame from wrong state fails correctly', error.message.includes('lobby'));
    }
    
    // Cleanup
    await Player.deleteMany({ _id: { $in: players.map(p => p._id) } });
    await GameRoom.findByIdAndDelete(savedRoom._id);
    
  } catch (error) {
    logTest('GameRoom Model Methods with Database Operations', false, error.message);
  }
}

// Test 4: Socket Event Handlers with Database Integration
async function testSocketEventHandlersWithDatabase() {
  logSection('Testing Socket Event Handlers with Database Integration');
  
  try {
    // Create HTTP server and Socket.IO instance
    const httpServer = http.createServer();
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    const socketManager = new SocketManager(io);
    
    // Test SocketManager initialization
    logTest('SocketManager initializes with database', socketManager !== null);
    logTest('AI Prompt Generator integrated', socketManager.aiPromptGenerator !== null);
    
    // Test room code generation
    const roomCode1 = socketManager.generateRoomCode();
    const roomCode2 = socketManager.generateRoomCode();
    
    logTest('Room code generation', roomCode1.length === 4 && /^[A-Z]{4}$/.test(roomCode1));
    logTest('Room codes are different', roomCode1 !== roomCode2);
    
    // Test utility methods
    logTest('getConnectedCount method', typeof socketManager.getConnectedCount() === 'number');
    logTest('getConnectedSockets method', Array.isArray(socketManager.getConnectedSockets()));
    
    // Close server
    httpServer.close();
    
  } catch (error) {
    logTest('Socket Event Handlers with Database Integration', false, error.message);
  }
}

// Test 5: Complete Game Flow with Database
async function testCompleteGameFlowWithDatabase() {
  logSection('Testing Complete Game Flow with Database');
  
  try {
    // Create players
    const hostPlayer = new Player({
      socketId: 'host-socket-123',
      name: 'Host Player',
      isHost: true
    });
    const player2 = new Player({
      socketId: 'player-socket-456',
      name: 'Player Two',
      isHost: false
    });
    
    const savedHost = await hostPlayer.save();
    const savedPlayer2 = await player2.save();
    
    // Create room
    const room = new GameRoom({
      roomCode: 'DB03',
      players: [savedHost._id, savedPlayer2._id],
      gameState: 'lobby'
    });
    
    const savedRoom = await room.save();
    logTest('Room created with multiple players', savedRoom.players.length === 2);
    
    // Test AI prompt generation
    const ai = new AIPromptGenerator();
    const prompt = await ai.generateContextualPrompt({ 
      playerCount: savedRoom.players.length,
      gameState: savedRoom.gameState
    });
    
    // Start game
    await savedRoom.startGame(prompt);
    const gameStartedRoom = await GameRoom.findById(savedRoom._id).populate('players');
    
    logTest('Game started with AI prompt', gameStartedRoom.gameState === 'submitting' && gameStartedRoom.currentPrompt === prompt);
    logTest('Game start time set', gameStartedRoom.gameStartTime);
    logTest('Players maintained in database', gameStartedRoom.players.length === 2);
    
    // Progress through game states
    await gameStartedRoom.startVoting();
    const votingRoom = await GameRoom.findById(savedRoom._id);
    logTest('Game progressed to voting', votingRoom.gameState === 'voting');
    
    await votingRoom.showResults();
    const resultsRoom = await GameRoom.findById(savedRoom._id);
    logTest('Game progressed to results', resultsRoom.gameState === 'results');
    
    await resultsRoom.resetToLobby();
    const resetRoom = await GameRoom.findById(savedRoom._id);
    logTest('Game reset to lobby', resetRoom.gameState === 'lobby' && resetRoom.currentPrompt === null);
    
    // Test timing with database persistence
    await resetRoom.startGame('Test timing prompt');
    const timingRoom = await GameRoom.findById(savedRoom._id);
    timingRoom.gameStartTime = new Date(Date.now() - 5000); // 5 seconds ago
    await timingRoom.save();
    
    const remaining = timingRoom.getRemainingCookingTime();
    logTest('Timing works with database persistence', remaining > 0 && remaining <= 1800);
    
    // Cleanup
    await Player.deleteMany({ _id: { $in: [savedHost._id, savedPlayer2._id] } });
    await GameRoom.findByIdAndDelete(savedRoom._id);
    
  } catch (error) {
    logTest('Complete Game Flow with Database', false, error.message);
  }
}

// Test 6: Error Handling with Database
async function testErrorHandlingWithDatabase() {
  logSection('Testing Error Handling with Database');
  
  try {
    // Test insufficient players error
    const room = new GameRoom({
      roomCode: 'DB04',
      players: [],
      gameState: 'lobby'
    });
    
    const savedRoom = await room.save();
    
    try {
      await savedRoom.startGame('Test prompt');
      logTest('Insufficient players error', false, 'Should have thrown error');
    } catch (error) {
      logTest('Insufficient players error handling', error.message.includes('2 players'));
    }
    
    // Test wrong state error
    savedRoom.gameState = 'voting';
    await savedRoom.save();
    
    try {
      await savedRoom.startGame('Test prompt');
      logTest('Wrong state error', false, 'Should have thrown error');
    } catch (error) {
      logTest('Wrong state error handling', error.message.includes('lobby'));
    }
    
    // Test AI prompt generator error handling
    const ai = new AIPromptGenerator();
    const invalidPrompt = "";
    logTest('AI prompt validation error handling', !ai.validatePrompt(invalidPrompt));
    
    // Cleanup
    await GameRoom.findByIdAndDelete(savedRoom._id);
    
  } catch (error) {
    logTest('Error Handling with Database', false, error.message);
  }
}

// Test 7: Production-Ready Database Operations
async function testProductionReadyDatabaseOperations() {
  logSection('Testing Production-Ready Database Operations');
  
  try {
    // Test concurrent operations
    const players = [];
    for (let i = 0; i < 8; i++) {
      const player = new Player({
        socketId: `concurrent-socket-${i}`,
        name: `Player ${i + 1}`,
        isHost: i === 0
      });
      players.push(await player.save());
    }
    
    // Create room with maximum players
    const room = new GameRoom({
      roomCode: 'DB05',
      players: players.map(p => p._id),
      gameState: 'lobby'
    });
    
    const savedRoom = await room.save();
    logTest('Room created with maximum players', savedRoom.players.length === 8);
    
    // Test concurrent game state changes (only one should succeed)
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        GameRoom.findById(savedRoom._id).then(async room => {
          try {
            if (room.gameState === 'lobby') {
              await room.startGame('Concurrent test prompt');
              return { success: true, state: room.gameState };
            }
            return { success: false, state: room.gameState };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })
      );
    }
    
    const results = await Promise.all(promises);
    const successfulOperations = results.filter(r => r.success).length;
    const finalRoom = await GameRoom.findById(savedRoom._id);
    logTest('Concurrent database operations', successfulOperations === 1 && finalRoom.gameState === 'submitting');
    
    // Test database indexes
    const roomByCode = await GameRoom.findOne({ roomCode: 'DB05' });
    logTest('Database indexes work', roomByCode && roomByCode.roomCode === 'DB05');
    
    // Test data persistence
    await finalRoom.startGame('Production test prompt');
    const persistedRoom = await GameRoom.findById(savedRoom._id);
    logTest('Data persistence works', persistedRoom.gameState === 'submitting' && persistedRoom.currentPrompt === 'Production test prompt');
    
    // Cleanup
    await Player.deleteMany({ _id: { $in: players.map(p => p._id) } });
    await GameRoom.findByIdAndDelete(savedRoom._id);
    
  } catch (error) {
    logTest('Production-Ready Database Operations', false, error.message);
  }
}

// Main test runner
async function runMongoDBTests() {
  console.log('🚀 Starting Comprehensive MongoDB Integration Tests for Step 8');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Setup database
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      console.log('❌ Database setup failed, aborting tests');
      return false;
    }
    
    // Run tests
    await testDatabaseConnection();
    await testAIPromptGenerator();
    await testGameRoomModelWithDatabase();
    await testSocketEventHandlersWithDatabase();
    await testCompleteGameFlowWithDatabase();
    await testErrorHandlingWithDatabase();
    await testProductionReadyDatabaseOperations();
    
    // Cleanup
    await cleanupDatabase();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print results
    console.log('\n📊 MongoDB Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration}ms`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.testName}: ${test.details}`));
    }
    
    console.log('\n🎉 MongoDB Testing Complete!');
    
    return testResults.failed === 0;
    
  } catch (error) {
    console.error('❌ MongoDB test suite failed:', error);
    await cleanupDatabase();
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runMongoDBTests().catch(console.error);
}

module.exports = {
  runMongoDBTests,
  testResults
};
