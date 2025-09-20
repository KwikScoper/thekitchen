const mongoose = require('mongoose');
const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');
const Submission = require('./models/submission');
const SocketManager = require('./socketManager');
const AIPromptGenerator = require('./services/aiPromptGenerator');
const ImageUploader = require('./services/imageUploader');
const { Server } = require('socket.io');
const { createServer } = require('http');

/**
 * Complete Game Flow Integration Test for Step 10: Voting System
 * Tests the voting system as part of the complete game flow
 */

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/thekitchen_test',
  PORT: 3004,
  TIMEOUT: 20000
};

class CompleteGameFlowTester {
  constructor() {
    this.server = null;
    this.io = null;
    this.socketManager = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: []
    };
  }

  /**
   * Initialize test environment
   */
  async initialize() {
    try {
      console.log('🔧 Initializing complete game flow test environment...');
      
      // Connect to MongoDB
      await mongoose.connect(TEST_CONFIG.MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      // Create HTTP server and Socket.IO instance
      this.server = createServer();
      this.io = new Server(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      // Initialize SocketManager
      this.socketManager = new SocketManager(this.io);
      console.log('✅ SocketManager initialized');

      // Start server
      await new Promise((resolve) => {
        this.server.listen(TEST_CONFIG.PORT, resolve);
      });
      console.log(`✅ Test server started on port ${TEST_CONFIG.PORT}`);

    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error);
      throw error;
    }
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up test environment...');
      
      // Close server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }

      // Close Socket.IO
      if (this.io) {
        this.io.close();
      }

      // Clear database
      await Promise.all([
        Player.deleteMany({}),
        GameRoom.deleteMany({}),
        Submission.deleteMany({})
      ]);

      // Close MongoDB connection
      await mongoose.connection.close();
      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running integration test: ${testName}`);
      this.testResults.total++;
      
      await testFunction();
      
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.passed++;
      
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  /**
   * Create mock image data
   */
  createMockImageData() {
    // Create a simple 1x1 pixel PNG in base64
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return {
      imageData: base64Image,
      fileName: 'test-image.png',
      fileSize: base64Image.length,
      mimeType: 'image/png'
    };
  }

  /**
   * Test 1: Complete Game Flow with Voting
   */
  async testCompleteGameFlowWithVoting() {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    
    // Step 1: Create room
    const hostPlayer = new Player({
      socketId: `test-socket-${timestamp}-${randomSuffix}-host`,
      name: `Host-${timestamp}`,
      isHost: true
    });
    await hostPlayer.save();

    const roomCode = `GF${timestamp.toString().slice(-2)}`;
    const room = new GameRoom({
      roomCode: roomCode,
      players: [hostPlayer._id],
      gameState: 'lobby'
    });
    await room.save();

    // Step 2: Add more players
    const players = [hostPlayer];
    for (let i = 1; i < 4; i++) {
      const player = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-${i}`,
        name: `Player-${i}-${timestamp}`,
        isHost: false
      });
      await player.save();
      await room.addPlayer(player._id);
      players.push(player);
    }

    // Step 3: Start game
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartGame(mockHostSocket, { roomCode: room.roomCode });

    // Verify game started
    const updatedRoom = await GameRoom.findById(room._id);
    if (updatedRoom.gameState !== 'submitting') {
      throw new Error('Game should be in submitting state');
    }

    // Step 4: All players submit images
    const submissions = [];
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const imageData = this.createMockImageData();
      
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleSubmitImage(mockSocket, {
        roomCode: room.roomCode,
        ...imageData
      });

      // Get the created submission
      const submission = await Submission.findOne({ playerId: player._id, roomId: room._id });
      submissions.push(submission);
    }

    // Verify all submissions were created
    if (submissions.length !== players.length) {
      throw new Error(`Expected ${players.length} submissions, got ${submissions.length}`);
    }

    // Step 5: Start voting (should happen automatically after all submissions)
    const finalRoom = await GameRoom.findById(room._id);
    if (finalRoom.gameState !== 'voting') {
      throw new Error('Game should automatically transition to voting state');
    }

    // Step 6: All players vote
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const targetSubmission = submissions[(i + 1) % submissions.length]; // Vote for different submission
      
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: targetSubmission._id.toString()
      });
    }

    // Step 7: Verify results
    const resultsRoom = await GameRoom.findById(room._id);
    if (resultsRoom.gameState !== 'results') {
      throw new Error('Game should transition to results state after all votes');
    }

    // Verify vote counts
    const finalSubmissions = await Submission.find({ roomId: room._id });
    const totalVotes = finalSubmissions.reduce((sum, sub) => sum + sub.votes.length, 0);
    
    if (totalVotes !== players.length) {
      throw new Error(`Expected ${players.length} total votes, got ${totalVotes}`);
    }

    console.log(`✅ Complete game flow completed successfully with ${players.length} players`);
  }

  /**
   * Test 2: Voting with Partial Submissions
   */
  async testVotingWithPartialSubmissions() {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    
    // Create room and players
    const hostPlayer = new Player({
      socketId: `test-socket-${timestamp}-${randomSuffix}-host`,
      name: `Host-${timestamp}`,
      isHost: true
    });
    await hostPlayer.save();

    const roomCode = `PS${timestamp.toString().slice(-2)}`;
    const room = new GameRoom({
      roomCode: roomCode,
      players: [hostPlayer._id],
      gameState: 'lobby'
    });
    await room.save();

    // Add 3 more players
    const players = [hostPlayer];
    for (let i = 1; i < 4; i++) {
      const player = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-${i}`,
        name: `Player-${i}-${timestamp}`,
        isHost: false
      });
      await player.save();
      await room.addPlayer(player._id);
      players.push(player);
    }

    // Start game
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartGame(mockHostSocket, { roomCode: room.roomCode });

    // Only 2 players submit (not all)
    const imageData = this.createMockImageData();
    for (let i = 0; i < 2; i++) {
      const player = players[i];
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleSubmitImage(mockSocket, {
        roomCode: room.roomCode,
        ...imageData
      });
    }

    // Host manually starts voting (since not all players submitted)
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });

    // Verify voting started
    const votingRoom = await GameRoom.findById(room._id);
    if (votingRoom.gameState !== 'voting') {
      throw new Error('Voting should have started');
    }

    // Only the players who submitted can vote
    const submissions = await Submission.find({ roomId: room._id });
    if (submissions.length !== 2) {
      throw new Error(`Expected 2 submissions, got ${submissions.length}`);
    }

    console.log(`✅ Partial submission voting test completed`);
  }

  /**
   * Test 3: Voting with Disconnections
   */
  async testVotingWithDisconnections() {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    
    // Create room and players
    const hostPlayer = new Player({
      socketId: `test-socket-${timestamp}-${randomSuffix}-host`,
      name: `Host-${timestamp}`,
      isHost: true
    });
    await hostPlayer.save();

    const roomCode = `DC${timestamp.toString().slice(-2)}`;
    const room = new GameRoom({
      roomCode: roomCode,
      players: [hostPlayer._id],
      gameState: 'lobby'
    });
    await room.save();

    // Add 3 more players
    const players = [hostPlayer];
    for (let i = 1; i < 4; i++) {
      const player = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-${i}`,
        name: `Player-${i}-${timestamp}`,
        isHost: false
      });
      await player.save();
      await room.addPlayer(player._id);
      players.push(player);
    }

    // Start game and get all submissions
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartGame(mockHostSocket, { roomCode: room.roomCode });

    // All players submit
    const imageData = this.createMockImageData();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleSubmitImage(mockSocket, {
        roomCode: room.roomCode,
        ...imageData
      });
    }

    // Simulate player disconnection during voting
    const disconnectingPlayer = players[2];
    await this.socketManager.handleDisconnect({ id: disconnectingPlayer.socketId });

    // Verify player was removed from room
    const updatedRoom = await GameRoom.findById(room._id).populate('players');
    if (updatedRoom.players.length !== players.length - 1) {
      throw new Error(`Expected ${players.length - 1} players after disconnection, got ${updatedRoom.players.length}`);
    }

    // Continue voting with remaining players
    const remainingPlayers = updatedRoom.players;
    const remainingSubmissions = await Submission.find({ roomId: room._id });
    
    for (let i = 0; i < remainingPlayers.length; i++) {
      const player = remainingPlayers[i];
      // Find a submission that doesn't belong to this player
      const targetSubmission = remainingSubmissions.find(sub => 
        sub.playerId.toString() !== player._id.toString()
      );
      
      if (!targetSubmission) {
        throw new Error('No valid submission found for voting');
      }
      
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: targetSubmission._id.toString()
      });
    }

    // Verify results
    const finalRoom = await GameRoom.findById(room._id);
    if (finalRoom.gameState !== 'results') {
      throw new Error('Game should transition to results state');
    }

    console.log(`✅ Disconnection during voting test completed`);
  }

  /**
   * Test 4: Multiple Concurrent Games
   */
  async testMultipleConcurrentGames() {
    const timestamp = Date.now();
    const games = [];

    // Create 3 concurrent games
    for (let gameIndex = 0; gameIndex < 3; gameIndex++) {
      const randomSuffix = Math.floor(Math.random() * 1000);
      
      // Create room and players
      const hostPlayer = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-host-${gameIndex}`,
        name: `Host-${gameIndex}-${timestamp}`,
        isHost: true
      });
      await hostPlayer.save();

      const roomCode = `MC${gameIndex}${timestamp.toString().slice(-1)}`;
      const room = new GameRoom({
        roomCode: roomCode,
        players: [hostPlayer._id],
        gameState: 'lobby'
      });
      await room.save();

      // Add 2 more players
      const players = [hostPlayer];
      for (let i = 1; i < 3; i++) {
        const player = new Player({
          socketId: `test-socket-${timestamp}-${randomSuffix}-${i}-${gameIndex}`,
          name: `Player-${i}-${gameIndex}-${timestamp}`,
          isHost: false
        });
        await player.save();
        await room.addPlayer(player._id);
        players.push(player);
      }

      games.push({ room, players, hostPlayer });
    }

    // Run all games concurrently
    const gamePromises = games.map(async (game, gameIndex) => {
      const { room, players, hostPlayer } = game;

      // Start game
      const mockHostSocket = {
        id: hostPlayer.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Game ${gameIndex} Host error: ${data.message}`);
          }
        }
      };
      await this.socketManager.handleStartGame(mockHostSocket, { roomCode: room.roomCode });

      // All players submit
      const imageData = this.createMockImageData();
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const mockSocket = {
          id: player.socketId,
          emit: (event, data) => {
            if (event === 'error') {
              throw new Error(`Game ${gameIndex} Player ${player.name} error: ${data.message}`);
            }
          }
        };

        await this.socketManager.handleSubmitImage(mockSocket, {
          roomCode: room.roomCode,
          ...imageData
        });
      }

      // All players vote
      const submissions = await Submission.find({ roomId: room._id });
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const targetSubmission = submissions[(i + 1) % submissions.length];
        
        const mockSocket = {
          id: player.socketId,
          emit: (event, data) => {
            if (event === 'error') {
              throw new Error(`Game ${gameIndex} Player ${player.name} error: ${data.message}`);
            }
          }
        };

        await this.socketManager.handleCastVote(mockSocket, {
          roomCode: room.roomCode,
          submissionId: targetSubmission._id.toString()
        });
      }

      // Verify results
      const finalRoom = await GameRoom.findById(room._id);
      if (finalRoom.gameState !== 'results') {
        throw new Error(`Game ${gameIndex} should be in results state`);
      }

      return gameIndex;
    });

    // Wait for all games to complete
    const completedGames = await Promise.all(gamePromises);
    
    if (completedGames.length !== 3) {
      throw new Error(`Expected 3 games to complete, got ${completedGames.length}`);
    }

    console.log(`✅ Multiple concurrent games test completed`);
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting Step 10: Complete Game Flow Integration Tests');
    console.log('=' .repeat(80));

    try {
      await this.initialize();

      // Run all integration tests
      await this.runTest('Complete Game Flow with Voting', () => this.testCompleteGameFlowWithVoting());
      await this.runTest('Voting with Partial Submissions', () => this.testVotingWithPartialSubmissions());
      await this.runTest('Voting with Disconnections', () => this.testVotingWithDisconnections());
      await this.runTest('Multiple Concurrent Games', () => this.testMultipleConcurrentGames());

      // Print results
      console.log('\n' + '=' .repeat(80));
      console.log('📊 INTEGRATION TEST RESULTS SUMMARY');
      console.log('=' .repeat(80));
      console.log(`Total Tests: ${this.testResults.total}`);
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

      if (this.testResults.errors.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        this.testResults.errors.forEach(error => {
          console.log(`   - ${error.test}: ${error.error}`);
        });
      }

      if (this.testResults.failed === 0) {
        console.log('\n🎉 ALL INTEGRATION TESTS PASSED! Voting system integrates perfectly with complete game flow.');
      } else {
        console.log('\n⚠️  Some integration tests failed. Please review the errors above.');
      }

    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CompleteGameFlowTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CompleteGameFlowTester;
