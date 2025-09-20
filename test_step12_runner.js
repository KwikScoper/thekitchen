#!/usr/bin/env node

// Step 12: Room Page Testing Runner
// This script helps you test the RoomPage component thoroughly

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Step 12: Room Page Testing Runner');
console.log('=' .repeat(50));
console.log('This script will guide you through testing the RoomPage component.');
console.log('');

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const runTests = async () => {
  console.log('📋 Prerequisites Check:');
  console.log('1. Frontend running on http://localhost:5174');
  console.log('2. Backend running on http://localhost:3001');
  console.log('3. MongoDB connected');
  console.log('');
  
  const ready = await askQuestion('Are all prerequisites met? (y/n): ');
  if (ready.toLowerCase() !== 'y') {
    console.log('❌ Please ensure all prerequisites are met before testing.');
    process.exit(1);
  }
  
  console.log('');
  console.log('🎯 Testing Scenarios:');
  console.log('');
  
  // Test 1: Basic Room Page Load
  console.log('Test 1: Basic Room Page Load');
  console.log('1. Open http://localhost:5174');
  console.log('2. Create a room with name "Test Host"');
  console.log('3. Verify RoomPage loads correctly');
  console.log('4. Check room code is displayed prominently');
  console.log('5. Verify connection status shows "Connected"');
  console.log('');
  
  const test1 = await askQuestion('Did Test 1 pass? (y/n): ');
  
  // Test 2: Multi-Player Test
  console.log('');
  console.log('Test 2: Multi-Player Test');
  console.log('1. Open second browser tab');
  console.log('2. Join room from second tab');
  console.log('3. Verify first tab updates automatically');
  console.log('4. Check player list shows both players');
  console.log('5. Verify host controls visible only to host');
  console.log('');
  
  const test2 = await askQuestion('Did Test 2 pass? (y/n): ');
  
  // Test 3: Game Flow Test
  console.log('');
  console.log('Test 3: Complete Game Flow');
  console.log('1. Start game as host');
  console.log('2. Test submitting phase (timer, AI prompt)');
  console.log('3. Test voting phase (submissions, voting)');
  console.log('4. Test results phase (winner, scores)');
  console.log('5. Test play again functionality');
  console.log('');
  
  const test3 = await askQuestion('Did Test 3 pass? (y/n): ');
  
  // Test 4: Error Handling Test
  console.log('');
  console.log('Test 4: Error Handling');
  console.log('1. Try to start game with < 2 players');
  console.log('2. Disconnect internet during game');
  console.log('3. Reconnect and verify recovery');
  console.log('4. Try invalid actions');
  console.log('');
  
  const test4 = await askQuestion('Did Test 4 pass? (y/n): ');
  
  // Test 5: UI/UX Test
  console.log('');
  console.log('Test 5: UI/UX Test');
  console.log('1. Test on desktop (1920x1080)');
  console.log('2. Test on tablet (768x1024)');
  console.log('3. Test on mobile (375x667)');
  console.log('4. Test all interactive elements');
  console.log('5. Test hover effects and transitions');
  console.log('');
  
  const test5 = await askQuestion('Did Test 5 pass? (y/n): ');
  
  // Results Summary
  console.log('');
  console.log('📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const results = [
    { name: 'Basic Room Page Load', passed: test1.toLowerCase() === 'y' },
    { name: 'Multi-Player Test', passed: test2.toLowerCase() === 'y' },
    { name: 'Complete Game Flow', passed: test3.toLowerCase() === 'y' },
    { name: 'Error Handling', passed: test4.toLowerCase() === 'y' },
    { name: 'UI/UX Test', passed: test5.toLowerCase() === 'y' }
  ];
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log('');
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Step 12: Room Page and State Management is complete!');
    console.log('🚀 Ready for Step 13: Lobby Component');
  } else {
    console.log('');
    console.log('⚠️ Some tests failed.');
    console.log('🔧 Please fix the issues before proceeding to Step 13.');
  }
  
  // Additional Testing Options
  console.log('');
  console.log('🔍 Additional Testing Options:');
  console.log('1. Run automated test suite: node test_step12_automated.js');
  console.log('2. Use browser console tests: Load browser_test_step12.js');
  console.log('3. Follow detailed testing guide: TESTING_GUIDE_STEP12.md');
  console.log('4. Use testing checklist: TESTING_CHECKLIST_STEP12.md');
  
  rl.close();
};

runTests().catch(console.error);
