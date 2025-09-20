const mongoose = require('mongoose');
const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');
const Submission = require('./models/submission');
const SocketManager = require('./socketManager');
const { Server } = require('socket.io');
const { createServer } = require('http');

/**
 * Comprehensive Test Suite for Step 10: Voting System
 * Tests all voting functionality including validation, error handling, and game flow
 */

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/thekitchen_test',
  PORT: 3002,
  TIMEOUT: 10000
};

// Test data
const TEST_DATA = {
  players: [
    { name: 'Host Player', isHost: true },
    { name: 'Player 2', isHost: false },
    { name: 'Player 3', isHost: false },
    { name: 'Player 4', isHost: false }
  ],
  roomCode: 'TEST',
  submissions: [
    { imageUrl: 'https://example.com/image1.jpg' },
    { imageUrl: 'https://example.com/image2.jpg' },
    { imageUrl: 'https://example.com/image3.jpg' },
    { imageUrl: 'https://example.com/image4.jpg' }
  ]
};

class VotingSystemTester {
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
      console.log('🔧 Initializing voting system test environment...');
      
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
      console.log(`\n🧪 Running test: ${testName}`);
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
   * Create test players and room
   */
  async createTestSetup() {
    const players = [];
    const roomCode = TEST_DATA.roomCode;
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 100);

    // Create players with unique socket IDs
    for (let i = 0; i < TEST_DATA.players.length; i++) {
      const playerData = TEST_DATA.players[i];
      const player = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-${i}`,
        name: `${playerData.name}-${timestamp}-${randomSuffix}`,
        isHost: playerData.isHost
      });
      await player.save();
      players.push(player);
    }

    // Create room with unique 4-character code using more entropy
    const roomCodeSuffix = `${timestamp.toString().slice(-2)}${randomSuffix.toString().slice(-1)}`;
    const testRoomCode = `ED${roomCodeSuffix.slice(-2)}`; // Ensure exactly 4 characters with ED prefix
    
    // Double-check uniqueness to prevent collisions
    let finalRoomCode = testRoomCode;
    let counter = 0;
    while (counter < 10) {
      const existingRoom = await GameRoom.findOne({ roomCode: finalRoomCode });
      if (!existingRoom) {
        break;
      }
      // If collision, modify the room code
      finalRoomCode = `ED${(parseInt(roomCodeSuffix.slice(-2)) + counter).toString().slice(-2)}`;
      counter++;
    }
    
    const room = new GameRoom({
      roomCode: finalRoomCode,
      players: players.map(p => p._id),
      gameState: 'submitting',
      currentPrompt: 'Test cooking prompt',
      gameStartTime: new Date(),
      cookingTimeLimit: 1800 // 30 minutes in seconds (not milliseconds)
    });
    await room.save();

    // Create submissions
    const submissions = [];
    for (let i = 0; i < players.length; i++) {
      const submission = new Submission({
        playerId: players[i]._id,
        roomId: room._id,
        imageUrl: TEST_DATA.submissions[i].imageUrl
      });
      await submission.save();
      submissions.push(submission);
    }

    return { players, room, submissions };
  }

  /**
   * Test 1: Basic voting system functionality
   */
  async testBasicVotingFunctionality() {
    const { players, room, submissions } = await this.createTestSetup();
    
    // Test starting voting phase
    const hostPlayer = players.find(p => p.isHost);
    const voterPlayer = players.find(p => !p.isHost);
    
    // Mock socket for host
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };

    // Test startVoting
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });
    
    // Verify room state changed to voting
    const updatedRoom = await GameRoom.findById(room._id);
    if (updatedRoom.gameState !== 'voting') {
      throw new Error('Room state should be voting after starting voting');
    }

    // Test casting vote
    const mockVoterSocket = {
      id: voterPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Voter error: ${data.message}`);
        }
      }
    };

    await this.socketManager.handleCastVote(mockVoterSocket, {
      roomCode: room.roomCode,
      submissionId: submissions[0]._id.toString()
    });

    // Verify vote was added
    const updatedSubmission = await Submission.findById(submissions[0]._id);
    if (updatedSubmission.votes.length !== 1) {
      throw new Error('Vote should be added to submission');
    }
  }

  /**
   * Test 2: Vote validation - prevent self-voting
   */
  async testSelfVotePrevention() {
    const { players, room, submissions } = await this.createTestSetup();
    
    // Start voting phase
    const hostPlayer = players.find(p => p.isHost);
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });

    // Try to vote for own submission
    const playerWithSubmission = players[0];
    const playerSubmission = submissions.find(s => s.playerId.toString() === playerWithSubmission._id.toString());
    
    let errorCaught = false;
    const mockSocket = {
      id: playerWithSubmission.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'SELF_VOTE_NOT_ALLOWED') {
          errorCaught = true;
          return; // Expected error
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    try {
      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: playerSubmission._id.toString()
      });
      
      // If we get here without error, check if error was caught
      if (!errorCaught) {
        throw new Error('Self-vote should have been prevented');
      }
    } catch (error) {
      // This is expected - the error should be caught by the emit handler
      if (!errorCaught) {
        throw error;
      }
    }

    // Verify no vote was added
    const updatedSubmission = await Submission.findById(playerSubmission._id);
    if (updatedSubmission.votes.length !== 0) {
      throw new Error('Self-vote should be prevented');
    }
  }

  /**
   * Test 3: Vote validation - prevent duplicate votes
   */
  async testDuplicateVotePrevention() {
    const { players, room, submissions } = await this.createTestSetup();
    
    // Start voting phase
    const hostPlayer = players.find(p => p.isHost);
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });

    // Cast first vote
    const voterPlayer = players.find(p => !p.isHost);
    const mockSocket = {
      id: voterPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'ALREADY_VOTED') {
          return; // Expected error on second vote
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    // First vote should succeed
    await this.socketManager.handleCastVote(mockSocket, {
      roomCode: room.roomCode,
      submissionId: submissions[0]._id.toString()
    });

    // Second vote should fail
    await this.socketManager.handleCastVote(mockSocket, {
      roomCode: room.roomCode,
      submissionId: submissions[0]._id.toString()
    });

    // Verify only one vote was added
    const updatedSubmission = await Submission.findById(submissions[0]._id);
    if (updatedSubmission.votes.length !== 1) {
      throw new Error('Duplicate vote should be prevented');
    }
  }

  /**
   * Test 4: Host-only voting start validation
   */
  async testHostOnlyVotingStart() {
    const { players, room } = await this.createTestSetup();
    
    // Try to start voting as non-host
    const nonHostPlayer = players.find(p => !p.isHost);
    const mockSocket = {
      id: nonHostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'NOT_HOST') {
          return; // Expected error
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    await this.socketManager.handleStartVoting(mockSocket, { roomCode: room.roomCode });

    // Verify room state didn't change
    const updatedRoom = await GameRoom.findById(room._id);
    if (updatedRoom.gameState !== 'submitting') {
      throw new Error('Non-host should not be able to start voting');
    }
  }

  /**
   * Test 5: Game state validation
   */
  async testGameStateValidation() {
    const { players, room } = await this.createTestSetup();
    
    // Try to start voting when game is not in submitting state
    const hostPlayer = players.find(p => p.isHost);
    const mockSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'INVALID_GAME_STATE') {
          return; // Expected error
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    // Change room state to lobby
    await GameRoom.findByIdAndUpdate(room._id, { gameState: 'lobby' });

    await this.socketManager.handleStartVoting(mockSocket, { roomCode: room.roomCode });

    // Verify room state didn't change
    const updatedRoom = await GameRoom.findById(room._id);
    if (updatedRoom.gameState !== 'lobby') {
      throw new Error('Voting should not start when game is not in submitting state');
    }
  }

  /**
   * Test 6: Complete voting flow with automatic results
   */
  async testCompleteVotingFlow() {
    const { players, room, submissions } = await this.createTestSetup();
    
    // Start voting phase
    const hostPlayer = players.find(p => p.isHost);
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });

    // All players vote for different submissions
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const submissionIndex = (i + 1) % submissions.length; // Vote for different submission
      
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
        submissionId: submissions[submissionIndex]._id.toString()
      });
    }

    // Verify all votes were cast
    const allSubmissions = await Submission.find({ roomId: room._id });
    const totalVotes = allSubmissions.reduce((sum, sub) => sum + sub.votes.length, 0);
    
    if (totalVotes !== players.length) {
      throw new Error(`Expected ${players.length} votes, got ${totalVotes}`);
    }

    // Verify room transitioned to results
    const finalRoom = await GameRoom.findById(room._id);
    if (finalRoom.gameState !== 'results') {
      throw new Error('Room should transition to results phase after all votes');
    }
  }

  /**
   * Test 7: Error handling for invalid inputs
   */
  async testErrorHandling() {
    const { players, room } = await this.createTestSetup();
    
    const player = players[0];
    const mockSocket = {
      id: player.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          return; // Expected errors
        }
      }
    };

    // Test invalid room code
    await this.socketManager.handleStartVoting(mockSocket, { roomCode: 'INVALID' });
    await this.socketManager.handleCastVote(mockSocket, { roomCode: 'INVALID', submissionId: 'invalid' });

    // Test invalid submission ID
    await this.socketManager.handleCastVote(mockSocket, { 
      roomCode: room.roomCode, 
      submissionId: 'invalid-submission-id' 
    });

    // Test missing parameters
    await this.socketManager.handleStartVoting(mockSocket, {});
    await this.socketManager.handleCastVote(mockSocket, { roomCode: room.roomCode });
  }

  /**
   * Test 8: Vote counting and winner determination
   */
  async testVoteCountingAndWinner() {
    const { players, room, submissions } = await this.createTestSetup();
    
    // Start voting phase
    const hostPlayer = players.find(p => p.isHost);
    const mockHostSocket = {
      id: hostPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host error: ${data.message}`);
        }
      }
    };
    await this.socketManager.handleStartVoting(mockHostSocket, { roomCode: room.roomCode });

    // Create a clear winner by having multiple players vote for the same submission
    const winningSubmission = submissions[0];
    const voters = players.filter(p => !p.isHost); // All non-host players vote for same submission

    for (const voter of voters) {
      const mockSocket = {
        id: voter.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Voter ${voter.name} error: ${data.message}`);
          }
        }
      };

      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: winningSubmission._id.toString()
      });
    }

    // Verify winner has most votes
    const finalSubmissions = await Submission.find({ roomId: room._id }).sort({ voteCount: -1 });
    const winner = finalSubmissions[0];
    
    if (winner.voteCount !== voters.length) {
      throw new Error(`Winner should have ${voters.length} votes, got ${winner.voteCount}`);
    }

    if (winner._id.toString() !== winningSubmission._id.toString()) {
      throw new Error('Wrong submission won');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Step 10: Voting System Test Suite');
    console.log('=' .repeat(60));

    try {
      await this.initialize();

      // Run all tests
      await this.runTest('Basic Voting Functionality', () => this.testBasicVotingFunctionality());
      await this.runTest('Self-Vote Prevention', () => this.testSelfVotePrevention());
      await this.runTest('Duplicate Vote Prevention', () => this.testDuplicateVotePrevention());
      await this.runTest('Host-Only Voting Start', () => this.testHostOnlyVotingStart());
      await this.runTest('Game State Validation', () => this.testGameStateValidation());
      await this.runTest('Complete Voting Flow', () => this.testCompleteVotingFlow());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Vote Counting and Winner', () => this.testVoteCountingAndWinner());

      // Print results
      console.log('\n' + '=' .repeat(60));
      console.log('📊 TEST RESULTS SUMMARY');
      console.log('=' .repeat(60));
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
        console.log('\n🎉 ALL TESTS PASSED! Voting system is working correctly.');
      } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
      }

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new VotingSystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = VotingSystemTester;
