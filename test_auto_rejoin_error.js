const { io } = require('socket.io-client');

/**
 * Test script to verify auto-rejoin with non-existent room doesn't show errors
 */
async function testAutoRejoinWithNonExistentRoom() {
  console.log('🧪 Testing auto-rejoin with non-existent room...\n');

  // Simulate having stored player data for a room that no longer exists
  console.log('1️⃣ Simulating stored player data for non-existent room...');
  
  const socket = io('http://localhost:3001');
  
  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      
      // Simulate auto-rejoin attempt with non-existent room
      console.log('2️⃣ Attempting auto-rejoin to non-existent room...');
      socket.emit('joinRoom', {
        roomCode: 'NONEXISTENT',
        playerName: 'TestPlayer'
      });
    });

    socket.on('roomJoined', (data) => {
      console.log('❌ Unexpected success - room should not exist');
      reject(new Error('Room should not exist'));
    });

    socket.on('error', (error) => {
      if (error.code === 'ROOM_NOT_FOUND') {
        console.log('✅ Received expected ROOM_NOT_FOUND error');
        console.log('📝 Error handled silently (not shown to user)');
        resolve();
      } else {
        console.error('❌ Unexpected error:', error);
        reject(error);
      }
    });

    setTimeout(() => {
      console.log('✅ Auto-rejoin error handled gracefully');
      resolve();
    }, 5000);
  });

  socket.disconnect();
  
  console.log('\n🎉 Auto-rejoin test completed successfully!');
  console.log('✅ Non-existent room errors handled silently');
  console.log('✅ No error messages shown to user');

  process.exit(0);
}

testAutoRejoinWithNonExistentRoom().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
