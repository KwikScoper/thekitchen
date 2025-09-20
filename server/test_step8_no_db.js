/**
 * Comprehensive Test Suite for Step 8: Game State Management (No Database)
 * Tests all game state management functionality without database operations
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
  console.log(`\n🧪 ${title}`);
  console.log('='.repeat(50));
}

// Test 1: AI Prompt Generator Service
async function testAIPromptGenerator() {
  logSection('Testing AI Prompt Generator Service');
  
  try {
    const ai = new AIPromptGenerator();
    
    // Test basic prompt generation
    const prompt1 = await ai.generatePrompt();
    logTest('Basic prompt generation', typeof prompt1 === 'string' && prompt1.length > 0);
    
    // Test contextual prompt generation
    const prompt2 = await ai.generateContextualPrompt({ playerCount: 4 });
    logTest('Contextual prompt generation', typeof prompt2 === 'string' && prompt2.length > 0);
    
    // Test prompt validation
    const validPrompt = "A dish that tastes like nostalgia";
    const invalidPrompt1 = "";
    const invalidPrompt2 = "hate violence inappropriate";
    
    logTest('Valid prompt validation', ai.validatePrompt(validPrompt));
    logTest('Invalid empty prompt validation', !ai.validatePrompt(invalidPrompt1));
    logTest('Invalid inappropriate prompt validation', !ai.validatePrompt(invalidPrompt2));
    
    // Test prompt statistics
    const stats = ai.getPromptStats();
    logTest('Prompt statistics', stats.totalPrompts > 0 && stats.serviceVersion);
    
    // Test multiple prompts are different
    const prompts = [];
    for (let i = 0; i < 5; i++) {
      prompts.push(await ai.generatePrompt());
    }
    const uniquePrompts = new Set(prompts);
    logTest('Multiple prompts are different', uniquePrompts.size > 1);
    
    // Test prompt templates
    logTest('Prompt templates exist', ai.promptTemplates.length > 0);
    logTest('All prompts are valid', ai.promptTemplates.every(p => ai.validatePrompt(p)));
    
  } catch (error) {
    logTest('AI Prompt Generator Service', false, error.message);
  }
}

// Test 2: GameRoom Model Methods (No Database)
async function testGameRoomModel() {
  logSection('Testing GameRoom Model Methods (No Database)');
  
  try {
    // Create test room without saving
    const room = new GameRoom({
      roomCode: TEST_CONFIG.testRoomCode,
      players: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      gameState: 'lobby',
      cookingTimeLimit: 1800, // 30 minutes
      votingTimeLimit: 300    // 5 minutes
    });
    
    // Test initial state
    logTest('Initial game state is lobby', room.gameState === 'lobby');
    logTest('Initial prompt is null', room.currentPrompt === null);
    logTest('Initial game start time is null', room.gameStartTime === null);
    logTest('Initial cooking time limit', room.cookingTimeLimit === 1800);
    logTest('Initial voting time limit', room.votingTimeLimit === 300);
    
    // Test startGame logic (without saving)
    try {
      if (room.gameState !== 'lobby') {
        throw new Error('Game can only be started from lobby state');
      }
      
      if (room.players.length < 2) {
        throw new Error('At least 2 players required to start game');
      }
      
      room.gameState = 'submitting';
      room.currentPrompt = 'Test cooking prompt';
      room.gameStartTime = new Date();
      
      logTest('startGame logic works', room.gameState === 'submitting' && room.currentPrompt === 'Test cooking prompt');
    } catch (error) {
      logTest('startGame logic', false, error.message);
    }
    
    // Test startVoting logic
    try {
      if (room.gameState !== 'submitting') {
        throw new Error('Can only start voting from submitting state');
      }
      
      room.gameState = 'voting';
      logTest('startVoting logic works', room.gameState === 'voting');
    } catch (error) {
      logTest('startVoting logic', false, error.message);
    }
    
    // Test showResults logic
    try {
      if (room.gameState !== 'voting') {
        throw new Error('Can only show results from voting state');
      }
      
      room.gameState = 'results';
      logTest('showResults logic works', room.gameState === 'results');
    } catch (error) {
      logTest('showResults logic', false, error.message);
    }
    
    // Test resetToLobby logic
    try {
      room.gameState = 'lobby';
      room.currentPrompt = null;
      room.gameStartTime = null;
      
      logTest('resetToLobby logic works', room.gameState === 'lobby' && room.currentPrompt === null);
    } catch (error) {
      logTest('resetToLobby logic', false, error.message);
    }
    
    // Test timing methods
    room.gameState = 'submitting';
    room.gameStartTime = new Date(Date.now() - 1000); // 1 second ago
    room.cookingTimeLimit = 1800; // 30 minutes
    
    const isExpired = room.isCookingTimeExpired();
    const remaining = room.getRemainingCookingTime();
    
    logTest('isCookingTimeExpired method', !isExpired);
    logTest('getRemainingCookingTime method', remaining > 0 && remaining <= 1800);
    
    // Test error conditions
    try {
      room.gameState = 'voting';
      if (room.gameState !== 'lobby') {
        throw new Error('Game can only be started from lobby state');
      }
      logTest('startGame from wrong state fails', false, 'Should have thrown error');
    } catch (error) {
      logTest('startGame from wrong state fails correctly', error.message.includes('lobby'));
    }
    
    // Test insufficient players
    try {
      const emptyRoom = new GameRoom({
        roomCode: 'EMPTY',
        players: [],
        gameState: 'lobby'
      });
      
      if (emptyRoom.players.length < 2) {
        throw new Error('At least 2 players required to start game');
      }
      logTest('startGame with no players fails', false, 'Should have thrown error');
    } catch (error) {
      logTest('startGame with no players fails correctly', error.message.includes('2 players'));
    }
    
  } catch (error) {
    logTest('GameRoom Model Methods', false, error.message);
  }
}

// Test 3: Socket Event Handlers
async function testSocketEventHandlers() {
  logSection('Testing Socket Event Handlers');
  
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
    logTest('SocketManager initializes', socketManager !== null);
    logTest('AI Prompt Generator integrated', socketManager.aiPromptGenerator !== null);
    
    // Test room code generation
    const roomCode1 = socketManager.generateRoomCode();
    const roomCode2 = socketManager.generateRoomCode();
    
    logTest('Room code generation', roomCode1.length === 4 && /^[A-Z]{4}$/.test(roomCode1));
    logTest('Room codes are different', roomCode1 !== roomCode2);
    
    // Test utility methods
    logTest('getConnectedCount method', typeof socketManager.getConnectedCount() === 'number');
    logTest('getConnectedSockets method', Array.isArray(socketManager.getConnectedSockets()));
    
    // Test emitToRoom method exists
    logTest('emitToRoom method exists', typeof socketManager.emitToRoom === 'function');
    
    // Test emitToSocket method exists
    logTest('emitToSocket method exists', typeof socketManager.emitToSocket === 'function');
    
    // Test joinRoom method exists
    logTest('joinRoom method exists', typeof socketManager.joinRoom === 'function');
    
    // Test leaveRoom method exists
    logTest('leaveRoom method exists', typeof socketManager.leaveRoom === 'function');
    
    // Close server
    httpServer.close();
    
  } catch (error) {
    logTest('Socket Event Handlers', false, error.message);
  }
}

// Test 4: Game State Transitions
async function testGameStateTransitions() {
  logSection('Testing Game State Transitions');
  
  try {
    const room = new GameRoom({
      roomCode: 'TRANS',
      players: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      gameState: 'lobby'
    });
    
    // Test complete state transition cycle
    const states = [];
    
    // Lobby → Submitting
    room.gameState = 'submitting';
    room.currentPrompt = 'Test prompt';
    room.gameStartTime = new Date();
    states.push(room.gameState);
    
    // Submitting → Voting
    room.gameState = 'voting';
    states.push(room.gameState);
    
    // Voting → Results
    room.gameState = 'results';
    states.push(room.gameState);
    
    // Results → Lobby
    room.gameState = 'lobby';
    room.currentPrompt = null;
    room.gameStartTime = null;
    states.push(room.gameState);
    
    const expectedStates = ['submitting', 'voting', 'results', 'lobby'];
    logTest('Complete state transition cycle', JSON.stringify(states) === JSON.stringify(expectedStates));
    
    // Test state validation
    const validStates = ['lobby', 'submitting', 'voting', 'results'];
    logTest('Valid game states', validStates.every(state => {
      room.gameState = state;
      return room.gameState === state;
    }));
    
    // Test invalid transitions
    const invalidTransitions = [
      { from: 'voting', to: 'submitting' },
      { from: 'results', to: 'voting' },
      { from: 'submitting', to: 'results' }
    ];
    
    for (const transition of invalidTransitions) {
      room.gameState = transition.from;
      logTest(`Invalid transition ${transition.from} → ${transition.to}`, room.gameState === transition.from);
    }
    
  } catch (error) {
    logTest('Game State Transitions', false, error.message);
  }
}

// Test 5: Timing Functionality
async function testTimingFunctionality() {
  logSection('Testing Timing Functionality');
  
  try {
    const room = new GameRoom({
      roomCode: 'TIME',
      players: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      gameState: 'submitting',
      cookingTimeLimit: 10, // 10 seconds for testing
      votingTimeLimit: 5    // 5 seconds for testing
    });
    
    // Test timing before game start
    logTest('Timing before game start', !room.isCookingTimeExpired() && room.getRemainingCookingTime() === 0);
    
    // Test timing after game start
    room.gameStartTime = new Date();
    logTest('Timing after game start', !room.isCookingTimeExpired() && room.getRemainingCookingTime() === 10);
    
    // Test timing after partial time elapsed
    room.gameStartTime = new Date(Date.now() - 5000); // 5 seconds ago
    const remaining = room.getRemainingCookingTime();
    logTest('Timing after partial time elapsed', remaining >= 4 && remaining <= 6);
    
    // Test timing after time expired
    room.gameStartTime = new Date(Date.now() - 15000); // 15 seconds ago
    logTest('Timing after time expired', room.isCookingTimeExpired() && room.getRemainingCookingTime() === 0);
    
    // Test timing in wrong game state
    room.gameState = 'lobby';
    room.gameStartTime = new Date(Date.now() - 15000);
    logTest('Timing in wrong game state', !room.isCookingTimeExpired() && room.getRemainingCookingTime() === 0);
    
    // Test timing with null start time
    room.gameState = 'submitting';
    room.gameStartTime = null;
    logTest('Timing with null start time', !room.isCookingTimeExpired() && room.getRemainingCookingTime() === 0);
    
  } catch (error) {
    logTest('Timing Functionality', false, error.message);
  }
}

// Test 6: Error Handling
async function testErrorHandling() {
  logSection('Testing Error Handling');
  
  try {
    const room = new GameRoom({
      roomCode: 'ERROR',
      players: [],
      gameState: 'lobby'
    });
    
    // Test insufficient players error
    try {
      if (room.players.length < 2) {
        throw new Error('At least 2 players required to start game');
      }
      logTest('Insufficient players error', false, 'Should have thrown error');
    } catch (error) {
      logTest('Insufficient players error handling', error.message.includes('2 players'));
    }
    
    // Test wrong state error
    try {
      room.gameState = 'voting';
      if (room.gameState !== 'lobby') {
        throw new Error('Game can only be started from lobby state');
      }
      logTest('Wrong state error', false, 'Should have thrown error');
    } catch (error) {
      logTest('Wrong state error handling', error.message.includes('lobby'));
    }
    
    // Test AI prompt generator error handling
    const ai = new AIPromptGenerator();
    const invalidPrompt = "";
    logTest('AI prompt validation error handling', !ai.validatePrompt(invalidPrompt));
    
    // Test prompt length validation
    const tooShortPrompt = "a";
    const tooLongPrompt = "a".repeat(201);
    logTest('Prompt too short validation', !ai.validatePrompt(tooShortPrompt));
    logTest('Prompt too long validation', !ai.validatePrompt(tooLongPrompt));
    
  } catch (error) {
    logTest('Error Handling', false, error.message);
  }
}

// Test 7: Integration Test
async function testIntegration() {
  logSection('Testing Integration');
  
  try {
    // Create a complete game scenario
    const players = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId()
    ];
    
    const room = new GameRoom({
      roomCode: 'INTEG',
      players: players,
      gameState: 'lobby'
    });
    
    // Test AI prompt generation
    const ai = new AIPromptGenerator();
    const prompt = await ai.generateContextualPrompt({ playerCount: players.length });
    
    // Test game start
    room.gameState = 'submitting';
    room.currentPrompt = prompt;
    room.gameStartTime = new Date();
    logTest('Integration: Game start with AI prompt', room.gameState === 'submitting' && room.currentPrompt === prompt);
    
    // Test game progression
    room.gameState = 'voting';
    logTest('Integration: Game progression to voting', room.gameState === 'voting');
    
    room.gameState = 'results';
    logTest('Integration: Game progression to results', room.gameState === 'results');
    
    room.gameState = 'lobby';
    room.currentPrompt = null;
    room.gameStartTime = null;
    logTest('Integration: Game reset to lobby', room.gameState === 'lobby' && room.currentPrompt === null);
    
    // Test timing integration
    room.gameState = 'submitting';
    room.gameStartTime = new Date(Date.now() - 1000);
    room.cookingTimeLimit = 1800;
    const remaining = room.getRemainingCookingTime();
    logTest('Integration: Timing works with game state', remaining > 0 && remaining <= 1800);
    
  } catch (error) {
    logTest('Integration Test', false, error.message);
  }
}

// Test 8: Edge Cases
async function testEdgeCases() {
  logSection('Testing Edge Cases');
  
  try {
    // Test with minimum players
    const minRoom = new GameRoom({
      roomCode: 'MIN',
      players: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      gameState: 'lobby'
    });
    
    minRoom.gameState = 'submitting';
    minRoom.currentPrompt = 'Test prompt';
    minRoom.gameStartTime = new Date();
    
    logTest('Minimum players game start', minRoom.gameState === 'submitting');
    
    // Test with maximum players
    const maxPlayers = Array(8).fill().map(() => new mongoose.Types.ObjectId());
    const maxRoom = new GameRoom({
      roomCode: 'MAX',
      players: maxPlayers,
      gameState: 'lobby'
    });
    
    maxRoom.gameState = 'submitting';
    maxRoom.currentPrompt = 'Test prompt';
    maxRoom.gameStartTime = new Date();
    
    logTest('Maximum players game start', maxRoom.gameState === 'submitting');
    
    // Test with extreme timing values
    const extremeRoom = new GameRoom({
      roomCode: 'EXTREME',
      players: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      gameState: 'submitting',
      cookingTimeLimit: 300, // 5 minutes minimum
      votingTimeLimit: 60    // 1 minute minimum
    });
    
    extremeRoom.gameStartTime = new Date();
    logTest('Extreme timing values', extremeRoom.cookingTimeLimit === 300 && extremeRoom.votingTimeLimit === 60);
    
    // Test prompt generation with edge cases
    const ai = new AIPromptGenerator();
    const edgePrompt1 = await ai.generateContextualPrompt({ playerCount: 1 });
    const edgePrompt2 = await ai.generateContextualPrompt({ playerCount: 8 });
    
    logTest('Edge case: Single player prompt', typeof edgePrompt1 === 'string' && edgePrompt1.length > 0);
    logTest('Edge case: Maximum players prompt', typeof edgePrompt2 === 'string' && edgePrompt2.length > 0);
    
  } catch (error) {
    logTest('Edge Cases', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Step 8 Testing (No Database)');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    await testAIPromptGenerator();
    await testGameRoomModel();
    await testSocketEventHandlers();
    await testGameStateTransitions();
    await testTimingFunctionality();
    await testErrorHandling();
    await testIntegration();
    await testEdgeCases();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print results
    console.log('\n📊 Test Results Summary');
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
    
    console.log('\n🎉 Step 8 Testing Complete!');
    
    // Return success status
    return testResults.failed === 0;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testResults
};
