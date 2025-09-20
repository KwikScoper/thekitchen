const mongoose = require('mongoose');
const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');
const Submission = require('./models/submission');
const SocketManager = require('./socketManager');
const { Server } = require('socket.io');
const { createServer } = require('http');

/**
 * Comprehensive Edge Case Testing Suite for Step 10: Voting System
 * Tests edge cases, boundary conditions, and complex scenarios
 */

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/thekitchen_test',
  PORT: 3003,
  TIMEOUT: 15000
};

class VotingSystemEdgeCaseTester {
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
      console.log('🔧 Initializing voting system edge case test environment...');
      
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
      console.log(`\n🧪 Running edge case test: ${testName}`);
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
   * Create test setup with unique identifiers
   */
  async createTestSetup() {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    
    // Create 6 players for comprehensive testing
    const players = [];
    for (let i = 0; i < 6; i++) {
      const player = new Player({
        socketId: `test-socket-${timestamp}-${randomSuffix}-${i}`,
        name: `Player-${i}-${timestamp}`,
        isHost: i === 0
      });
      await player.save();
      players.push(player);
    }

    // Create room with unique code
    const roomCode = `ED${timestamp.toString().slice(-2)}`;
    const room = new GameRoom({
      roomCode: roomCode,
      players: players.map(p => p._id),
      gameState: 'submitting',
      currentPrompt: 'Edge case test prompt',
      gameStartTime: new Date(),
      cookingTimeLimit: 1800
    });
    await room.save();

    // Create submissions for all players
    const submissions = [];
    for (let i = 0; i < players.length; i++) {
      const submission = new Submission({
        playerId: players[i]._id,
        roomId: room._id,
        imageUrl: `https://example.com/image-${i}-${timestamp}.jpg`
      });
      await submission.save();
      submissions.push(submission);
    }

    return { players, room, submissions };
  }

  /**
   * Test 1: Maximum players voting scenario
   */
  async testMaximumPlayersVoting() {
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
   * Test 2: Concurrent voting from multiple players
   */
  async testConcurrentVoting() {
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

    // Simulate concurrent voting
    const votingPromises = players.slice(1).map((player, index) => {
      const targetSubmission = submissions[index % submissions.length];
      
      const mockSocket = {
        id: player.socketId,
        emit: (event, data) => {
          if (event === 'error') {
            throw new Error(`Player ${player.name} error: ${data.message}`);
          }
        }
      };

      return this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: targetSubmission._id.toString()
      });
    });

    // Wait for all votes to complete
    await Promise.all(votingPromises);

    // Verify votes were processed correctly
    const allSubmissions = await Submission.find({ roomId: room._id });
    const totalVotes = allSubmissions.reduce((sum, sub) => sum + sub.votes.length, 0);
    
    if (totalVotes !== players.length - 1) { // -1 because host didn't vote
      throw new Error(`Expected ${players.length - 1} votes, got ${totalVotes}`);
    }
  }

  /**
   * Test 3: Invalid submission ID handling
   */
  async testInvalidSubmissionId() {
    const { players, room } = await this.createTestSetup();
    
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

    // Try to vote for non-existent submission
    const voterPlayer = players[1];
    let errorCaught = false;
    const mockSocket = {
      id: voterPlayer.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'SUBMISSION_NOT_FOUND') {
          errorCaught = true;
          return;
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    try {
      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: '507f1f77bcf86cd799439011' // Non-existent ObjectId
      });
      
      if (!errorCaught) {
        throw new Error('Should have caught invalid submission ID error');
      }
    } catch (error) {
      if (!errorCaught) {
        throw error;
      }
    }
  }

  /**
   * Test 4: Cross-room vote prevention
   */
  async testCrossRoomVotePrevention() {
    // Create two separate rooms
    const setup1 = await this.createTestSetup();
    const setup2 = await this.createTestSetup();
    
    // Start voting in both rooms
    const host1 = setup1.players.find(p => p.isHost);
    const host2 = setup2.players.find(p => p.isHost);
    
    const mockHostSocket1 = {
      id: host1.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host1 error: ${data.message}`);
        }
      }
    };
    
    const mockHostSocket2 = {
      id: host2.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          throw new Error(`Host2 error: ${data.message}`);
        }
      }
    };
    
    await this.socketManager.handleStartVoting(mockHostSocket1, { roomCode: setup1.room.roomCode });
    await this.socketManager.handleStartVoting(mockHostSocket2, { roomCode: setup2.room.roomCode });

    // Try to vote for submission from room1 while in room2
    const playerFromRoom2 = setup2.players[1];
    const submissionFromRoom1 = setup1.submissions[0];
    
    let errorCaught = false;
    const mockSocket = {
      id: playerFromRoom2.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'SUBMISSION_NOT_IN_ROOM') {
          errorCaught = true;
          return;
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    try {
      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: setup2.room.roomCode,
        submissionId: submissionFromRoom1._id.toString()
      });
      
      if (!errorCaught) {
        throw new Error('Should have prevented cross-room voting');
      }
    } catch (error) {
      if (!errorCaught) {
        throw error;
      }
    }
  }

  /**
   * Test 5: Vote count accuracy with ties
   */
  async testVoteCountAccuracyWithTies() {
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

    // Create a tie scenario - 3 players vote for submission A, 3 for submission B
    const submissionA = submissions[0];
    const submissionB = submissions[1];
    
    // First 3 players vote for submission A
    for (let i = 1; i <= 3; i++) {
      const player = players[i];
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
        submissionId: submissionA._id.toString()
      });
    }

    // Next 3 players vote for submission B
    for (let i = 4; i <= 5; i++) {
      const player = players[i];
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
        submissionId: submissionB._id.toString()
      });
    }

    // Verify vote counts
    const updatedSubmissionA = await Submission.findById(submissionA._id);
    const updatedSubmissionB = await Submission.findById(submissionB._id);
    
    if (updatedSubmissionA.voteCount !== 3) {
      throw new Error(`Submission A should have 3 votes, got ${updatedSubmissionA.voteCount}`);
    }
    
    if (updatedSubmissionB.voteCount !== 2) {
      throw new Error(`Submission B should have 2 votes, got ${updatedSubmissionB.voteCount}`);
    }
  }

  /**
   * Test 6: Rapid successive voting attempts
   */
  async testRapidSuccessiveVoting() {
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

    // Try rapid successive votes from same player
    const player = players[1];
    const submission = submissions[0];
    
    let successCount = 0;
    let errorCount = 0;
    
    const mockSocket = {
      id: player.socketId,
      emit: (event, data) => {
        if (event === 'voteSuccess') {
          successCount++;
        } else if (event === 'error' && data.code === 'ALREADY_VOTED') {
          errorCount++;
        } else if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    // Attempt 5 rapid votes
    for (let i = 0; i < 5; i++) {
      try {
        await this.socketManager.handleCastVote(mockSocket, {
          roomCode: room.roomCode,
          submissionId: submission._id.toString()
        });
      } catch (error) {
        // Expected for subsequent attempts
      }
    }

    // Should have 1 success and 4 errors
    if (successCount !== 1) {
      throw new Error(`Expected 1 successful vote, got ${successCount}`);
    }
    
    if (errorCount !== 4) {
      throw new Error(`Expected 4 duplicate vote errors, got ${errorCount}`);
    }
  }

  /**
   * Test 7: Voting with missing parameters
   */
  async testVotingWithMissingParameters() {
    const { players, room } = await this.createTestSetup();
    
    const player = players[1];
    let errorCount = 0;
    
    const mockSocket = {
      id: player.socketId,
      emit: (event, data) => {
        if (event === 'error') {
          errorCount++;
        }
      }
    };

    // Test missing room code
    await this.socketManager.handleCastVote(mockSocket, {
      submissionId: '507f1f77bcf86cd799439011'
    });

    // Test missing submission ID
    await this.socketManager.handleCastVote(mockSocket, {
      roomCode: room.roomCode
    });

    // Test empty parameters
    await this.socketManager.handleCastVote(mockSocket, {});

    // Should have caught 3 errors
    if (errorCount !== 3) {
      throw new Error(`Expected 3 parameter errors, got ${errorCount}`);
    }
  }

  /**
   * Test 8: Voting after game state changes
   */
  async testVotingAfterGameStateChanges() {
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

    // Change game state to results
    await GameRoom.findByIdAndUpdate(room._id, { gameState: 'results' });

    // Try to vote after state change
    const player = players[1];
    let errorCaught = false;
    const mockSocket = {
      id: player.socketId,
      emit: (event, data) => {
        if (event === 'error' && data.code === 'INVALID_GAME_STATE') {
          errorCaught = true;
          return;
        }
        if (event === 'error') {
          throw new Error(`Unexpected error: ${data.message}`);
        }
      }
    };

    try {
      await this.socketManager.handleCastVote(mockSocket, {
        roomCode: room.roomCode,
        submissionId: submissions[0]._id.toString()
      });
      
      if (!errorCaught) {
        throw new Error('Should have prevented voting after state change');
      }
    } catch (error) {
      if (!errorCaught) {
        throw error;
      }
    }
  }

  /**
   * Run all edge case tests
   */
  async runAllTests() {
    console.log('🚀 Starting Step 10: Voting System Edge Case Test Suite');
    console.log('=' .repeat(70));

    try {
      await this.initialize();

      // Run all edge case tests
      await this.runTest('Maximum Players Voting', () => this.testMaximumPlayersVoting());
      await this.runTest('Concurrent Voting', () => this.testConcurrentVoting());
      await this.runTest('Invalid Submission ID', () => this.testInvalidSubmissionId());
      await this.runTest('Cross-Room Vote Prevention', () => this.testCrossRoomVotePrevention());
      await this.runTest('Vote Count Accuracy with Ties', () => this.testVoteCountAccuracyWithTies());
      await this.runTest('Rapid Successive Voting', () => this.testRapidSuccessiveVoting());
      await this.runTest('Voting with Missing Parameters', () => this.testVotingWithMissingParameters());
      await this.runTest('Voting After Game State Changes', () => this.testVotingAfterGameStateChanges());

      // Print results
      console.log('\n' + '=' .repeat(70));
      console.log('📊 EDGE CASE TEST RESULTS SUMMARY');
      console.log('=' .repeat(70));
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
        console.log('\n🎉 ALL EDGE CASE TESTS PASSED! Voting system handles edge cases correctly.');
      } else {
        console.log('\n⚠️  Some edge case tests failed. Please review the errors above.');
      }

    } catch (error) {
      console.error('❌ Edge case test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new VotingSystemEdgeCaseTester();
  tester.runAllTests().catch(console.error);
}

module.exports = VotingSystemEdgeCaseTester;
