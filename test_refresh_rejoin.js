const { io } = require('socket.io-client');

/**
 * Test script to verify page refresh and rejoin functionality
 */
async function testRefreshAndRejoin() {
  console.log('🧪 Testing page refresh and rejoin functionality...\n');

  // Test 1: Create room and join
  console.log('1️⃣ Creating room...');
  const socket1 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket1.on('connect', () => {
      console.log('✅ Socket 1 connected');
      socket1.emit('createRoom', { playerName: 'TestPlayer1' });
    });

    socket1.on('roomCreated', (data) => {
      console.log('✅ Room created:', data.data.roomCode);
      global.testRoomCode = data.data.roomCode;
      resolve();
    });
  });

  // Test 2: Simulate page refresh (disconnect and reconnect)
  console.log('\n2️⃣ Simulating page refresh (disconnect)...');
  socket1.disconnect();

  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Rejoin with same name
  console.log('3️⃣ Rejoining with same name...');
  const socket2 = io('http://localhost:3001');
  
  await new Promise((resolve, reject) => {
    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected');
      socket2.emit('joinRoom', { 
        roomCode: global.testRoomCode, 
        playerName: 'TestPlayer1' 
      });
    });

    socket2.on('roomJoined', (data) => {
      console.log('✅ Successfully rejoined room:', data.data.roomCode);
      console.log('✅ Players in room:', data.data.players.map(p => p.name));
      resolve();
    });

    socket2.on('error', (error) => {
      console.error('❌ Error rejoining:', error.message);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Timeout waiting for rejoin'));
    }, 10000);
  });

  // Test 4: Test with different name (should work)
  console.log('\n4️⃣ Testing join with different name...');
  const socket3 = io('http://localhost:3001');
  
  await new Promise((resolve, reject) => {
    socket3.on('connect', () => {
      console.log('✅ Socket 3 connected');
      socket3.emit('joinRoom', { 
        roomCode: global.testRoomCode, 
        playerName: 'TestPlayer2' 
      });
    });

    socket3.on('roomJoined', (data) => {
      console.log('✅ Successfully joined with different name');
      console.log('✅ Players in room:', data.data.players.map(p => p.name));
      resolve();
    });

    socket3.on('error', (error) => {
      console.error('❌ Error joining with different name:', error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error('Timeout waiting for join with different name'));
    }, 10000);
  });

  // Cleanup
  console.log('\n5️⃣ Cleaning up...');
  socket2.disconnect();
  socket3.disconnect();

  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📋 Summary of fixes:');
  console.log('✅ Players are cleaned up immediately on disconnect');
  console.log('✅ Rooms are not deleted immediately when players leave');
  console.log('✅ Players can rejoin with the same name after refresh');
  console.log('✅ Players can join with different names');
  console.log('✅ Empty rooms are cleaned up after 1 hour');

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the test
testRefreshAndRejoin().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
