/**
 * Production-Ready Load Testing for Step 8
 * Simulates real-world usage with multiple concurrent users and database operations
 */

const mongoose = require('mongoose');
const GameRoom = require('./models/gameRoom');
const Player = require('./models/player');
const AIPromptGenerator = require('./services/aiPromptGenerator');
const SocketManager = require('./socketManager');
const { Server } = require('socket.io');
const http = require('http');
const io = require('socket.io-client');

// Test configuration
const TEST_CONFIG = {
  mongodbUri: 'mongodb://localhost:27017/thekitchen_test',
  serverUrl: 'http://localhost:3001',
  timeout: 30000,
  concurrentUsers: 20,
  roomsToCreate: 5
};

// Test results
let loadTestResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
  performance: {
    totalTime: 0,
    operationsPerSecond: 0,
    averageResponseTime: 0
  }
};

function logTest(testName, passed, details = '') {
  loadTestResults.total++;
  if (passed) {
    loadTestResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    loadTestResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
  loadTestResults.details.push({ testName, passed, details });
}

function logSection(title) {
  console.log(`\n⚡ ${title}`);
  console.log('='.repeat(50));
}

// Database setup
async function setupDatabase() {
  try {
    await mongoose.connect(TEST_CONFIG.mongodbUri);
    console.log('✅ Connected to MongoDB for load testing');
    
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
    await GameRoom.deleteMany({});
    await Player.deleteMany({});
    await mongoose.connection.close();
    console.log('✅ Database cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    return false;
  }
}

// Test 1: Concurrent Room Creation
async function testConcurrentRoomCreation() {
  logSection('Testing Concurrent Room Creation');
  
  const startTime = Date.now();
  const promises = [];
  
  try {
    // Create multiple rooms concurrently
    for (let i = 0; i < TEST_CONFIG.roomsToCreate; i++) {
      promises.push(createRoomWithPlayers(`LoadTest${i}`));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successfulRooms = results.filter(r => r.success).length;
    logTest('Concurrent room creation', successfulRooms === TEST_CONFIG.roomsToCreate);
    logTest('Room creation performance', duration < 5000, `${duration}ms for ${TEST_CONFIG.roomsToCreate} rooms`);
    
    // Test room uniqueness
    const rooms = await GameRoom.find({});
    const roomCodes = rooms.map(r => r.roomCode);
    const uniqueCodes = new Set(roomCodes);
    logTest('Room code uniqueness', uniqueCodes.size === roomCodes.length);
    
    return results;
    
  } catch (error) {
    logTest('Concurrent Room Creation', false, error.message);
    return [];
  }
}

async function createRoomWithPlayers(roomPrefix) {
  try {
    // Create host player
    const hostPlayer = new Player({
      socketId: `${roomPrefix}-host-socket`,
      name: `${roomPrefix} Host`,
      isHost: true
    });
    const savedHost = await hostPlayer.save();
    
    // Create additional players
    const players = [savedHost];
    for (let i = 1; i < 4; i++) {
      const player = new Player({
        socketId: `${roomPrefix}-player-${i}-socket`,
        name: `${roomPrefix} Player ${i}`,
        isHost: false
      });
      players.push(await player.save());
    }
    
    // Create room
    const room = new GameRoom({
      roomCode: `${roomPrefix}01`,
      players: players.map(p => p._id),
      gameState: 'lobby'
    });
    
    const savedRoom = await room.save();
    
    return {
      success: true,
      room: savedRoom,
      players: players
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test 2: Concurrent Game Starts
async function testConcurrentGameStarts(rooms) {
  logSection('Testing Concurrent Game Starts');
  
  const startTime = Date.now();
  const promises = [];
  
  try {
    // Start games concurrently
    for (const roomData of rooms) {
      if (roomData.success) {
        promises.push(startGameForRoom(roomData.room));
      }
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successfulStarts = results.filter(r => r.success).length;
    logTest('Concurrent game starts', successfulStarts === rooms.length);
    logTest('Game start performance', duration < 3000, `${duration}ms for ${rooms.length} games`);
    
    // Test AI prompt generation under load
    const ai = new AIPromptGenerator();
    const promptPromises = [];
    for (let i = 0; i < 10; i++) {
      promptPromises.push(ai.generatePrompt());
    }
    
    const prompts = await Promise.all(promptPromises);
    const uniquePrompts = new Set(prompts);
    logTest('AI prompt generation under load', uniquePrompts.size > 1);
    
    return results;
    
  } catch (error) {
    logTest('Concurrent Game Starts', false, error.message);
    return [];
  }
}

async function startGameForRoom(room) {
  try {
    const ai = new AIPromptGenerator();
    const prompt = await ai.generatePrompt();
    
    await room.startGame(prompt);
    
    return {
      success: true,
      room: room,
      prompt: prompt
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test 3: Database Performance Under Load
async function testDatabasePerformanceUnderLoad() {
  logSection('Testing Database Performance Under Load');
  
  const startTime = Date.now();
  const operations = [];
  
  try {
    // Create many players concurrently
    const playerPromises = [];
    for (let i = 0; i < TEST_CONFIG.concurrentUsers; i++) {
      playerPromises.push(
        new Player({
          socketId: `load-test-socket-${i}`,
          name: `Load Test User ${i}`,
          isHost: i < 5
        }).save()
      );
    }
    
    const players = await Promise.all(playerPromises);
    operations.push('Player creation');
    
    // Create rooms with players
    const roomPromises = [];
    for (let i = 0; i < 5; i++) {
      const roomPlayers = players.slice(i * 4, (i + 1) * 4);
      roomPromises.push(
        new GameRoom({
          roomCode: `LOAD${i}`,
          players: roomPlayers.map(p => p._id),
          gameState: 'lobby'
        }).save()
      );
    }
    
    const rooms = await Promise.all(roomPromises);
    operations.push('Room creation');
    
    // Concurrent game state changes
    const stateChangePromises = [];
    for (const room of rooms) {
      stateChangePromises.push(room.startGame('Load test prompt'));
    }
    
    await Promise.all(stateChangePromises);
    operations.push('Game state changes');
    
    // Concurrent queries
    const queryPromises = [];
    for (let i = 0; i < 10; i++) {
      queryPromises.push(GameRoom.find({ gameState: 'submitting' }).populate('players'));
    }
    
    const queryResults = await Promise.all(queryPromises);
    operations.push('Concurrent queries');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logTest('Database performance under load', duration < 10000, `${duration}ms for ${operations.length} operation types`);
    logTest('Concurrent player creation', players.length === TEST_CONFIG.concurrentUsers);
    logTest('Concurrent room creation', rooms.length === 5);
    logTest('Concurrent queries work', queryResults.every(result => Array.isArray(result)));
    
    // Test memory usage
    const memoryUsage = process.memoryUsage();
    logTest('Memory usage reasonable', memoryUsage.heapUsed < 100 * 1024 * 1024, `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
    
    return { players, rooms };
    
  } catch (error) {
    logTest('Database Performance Under Load', false, error.message);
    return { players: [], rooms: [] };
  }
}

// Test 4: Real-Time Socket Performance
async function testRealTimeSocketPerformance() {
  logSection('Testing Real-Time Socket Performance');
  
  const startTime = Date.now();
  const clients = [];
  
  try {
    // Create multiple socket connections
    for (let i = 0; i < 10; i++) {
      const client = io(TEST_CONFIG.serverUrl, {
        timeout: 5000,
        forceNew: true
      });
      clients.push(client);
    }
    
    // Wait for all connections
    await Promise.all(clients.map(client => new Promise(resolve => {
      client.on('connect', resolve);
      client.on('connect_error', resolve);
    })));
    
    const connectedClients = clients.filter(client => client.connected);
    logTest('Multiple socket connections', connectedClients.length === 10);
    
    // Test concurrent room creation via sockets
    const roomCreationPromises = connectedClients.map((client, index) => 
      new Promise(resolve => {
        client.emit('createRoom', { playerName: `Socket User ${index}` });
        client.on('roomCreated', (data) => resolve(data.success));
        client.on('error', () => resolve(false));
        setTimeout(() => resolve(false), 5000);
      })
    );
    
    const roomResults = await Promise.all(roomCreationPromises);
    const successfulRooms = roomResults.filter(r => r).length;
    logTest('Concurrent socket room creation', successfulRooms >= 8);
    
    // Cleanup
    clients.forEach(client => client.disconnect());
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    logTest('Socket performance', duration < 10000, `${duration}ms for 10 concurrent connections`);
    
  } catch (error) {
    logTest('Real-Time Socket Performance', false, error.message);
  }
}

// Test 5: Error Recovery Under Load
async function testErrorRecoveryUnderLoad() {
  logSection('Testing Error Recovery Under Load');
  
  try {
    // Test invalid operations under load
    const invalidPromises = [];
    for (let i = 0; i < 20; i++) {
      invalidPromises.push(
        GameRoom.findOne({ roomCode: 'INVALID' }).then(room => {
          if (room) {
            return room.startGame('test');
          }
          return null;
        }).catch(error => error.message)
      );
    }
    
    const errorResults = await Promise.all(invalidPromises);
    const errorCount = errorResults.filter(result => typeof result === 'string').length;
    logTest('Error handling under load', errorCount > 0);
    
    // Test recovery from errors
    const recoveryPromises = [];
    for (let i = 0; i < 10; i++) {
      recoveryPromises.push(
        new Player({
          socketId: `recovery-socket-${i}`,
          name: `Recovery User ${i}`,
          isHost: i === 0
        }).save()
      );
    }
    
    const recoveryResults = await Promise.all(recoveryPromises);
    logTest('Recovery from errors', recoveryResults.length === 10);
    
    // Cleanup
    await Player.deleteMany({ _id: { $in: recoveryResults.map(p => p._id) } });
    
  } catch (error) {
    logTest('Error Recovery Under Load', false, error.message);
  }
}

// Main test runner
async function runLoadTests() {
  console.log('🚀 Starting Production-Ready Load Tests for Step 8');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Setup database
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      console.log('❌ Database setup failed, aborting tests');
      return false;
    }
    
    // Run load tests
    const rooms = await testConcurrentRoomCreation();
    await testConcurrentGameStarts(rooms);
    await testDatabasePerformanceUnderLoad();
    await testRealTimeSocketPerformance();
    await testErrorRecoveryUnderLoad();
    
    // Cleanup
    await cleanupDatabase();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Calculate performance metrics
    loadTestResults.performance.totalTime = duration;
    loadTestResults.performance.operationsPerSecond = Math.round(loadTestResults.total / (duration / 1000));
    loadTestResults.performance.averageResponseTime = Math.round(duration / loadTestResults.total);
    
    // Print results
    console.log('\n📊 Load Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${loadTestResults.total}`);
    console.log(`Passed: ${loadTestResults.passed}`);
    console.log(`Failed: ${loadTestResults.failed}`);
    console.log(`Success Rate: ${((loadTestResults.passed / loadTestResults.total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${duration}ms`);
    console.log(`Operations/Second: ${loadTestResults.performance.operationsPerSecond}`);
    console.log(`Average Response Time: ${loadTestResults.performance.averageResponseTime}ms`);
    
    if (loadTestResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      loadTestResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.testName}: ${test.details}`));
    }
    
    console.log('\n🎉 Load Testing Complete!');
    
    return loadTestResults.failed === 0;
    
  } catch (error) {
    console.error('❌ Load test suite failed:', error);
    await cleanupDatabase();
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runLoadTests().catch(console.error);
}

module.exports = {
  runLoadTests,
  loadTestResults
};
