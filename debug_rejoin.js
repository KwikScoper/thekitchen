const { io } = require('socket.io-client');

/**
 * Debug script to test rejoin functionality
 */
async function debugRejoin() {
  console.log('🔍 Debugging rejoin functionality...\n');

  // Test 1: Create room
  console.log('1️⃣ Creating room...');
  const socket1 = io('http://localhost:3001');
  
  let roomCode;
  await new Promise((resolve) => {
    socket1.on('connect', () => {
      console.log('✅ Socket 1 connected');
      socket1.emit('createRoom', { playerName: 'DebugPlayer1' });
    });

    socket1.on('roomCreated', (data) => {
      console.log('✅ Room created:', data.data.roomCode);
      roomCode = data.data.roomCode;
      resolve();
    });
  });

  // Test 2: Disconnect (simulate refresh)
  console.log('\n2️⃣ Disconnecting (simulating refresh)...');
  socket1.disconnect();
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 3: Try to rejoin
  console.log('3️⃣ Attempting to rejoin...');
  const socket2 = io('http://localhost:3001');
  
  await new Promise((resolve, reject) => {
    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected');
      console.log('🔍 Attempting to join room:', roomCode);
      socket2.emit('joinRoom', { 
        roomCode: roomCode, 
        playerName: 'DebugPlayer1' 
      });
    });

    socket2.on('roomJoined', (data) => {
      console.log('✅ Successfully rejoined!');
      console.log('📊 Room data:', JSON.stringify(data.data, null, 2));
      resolve();
    });

    socket2.on('error', (error) => {
      console.error('❌ Error rejoining:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      reject(error);
    });

    setTimeout(() => {
      reject(new Error('Timeout waiting for rejoin'));
    }, 10000);
  });

  socket2.disconnect();
  console.log('\n🎉 Debug completed successfully!');
  process.exit(0);
}

debugRejoin().catch((error) => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
