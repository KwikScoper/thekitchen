const { io } = require('socket.io-client');

/**
 * Detailed test script to debug player identity issues
 */
async function debugPlayerIdentity() {
  console.log('🔍 Debugging player identity preservation...\n');

  // Test 1: Create room with host
  console.log('1️⃣ Creating room with host...');
  const socket1 = io('http://localhost:3001');
  let roomCode;
  
  await new Promise((resolve) => {
    socket1.on('connect', () => {
      socket1.emit('createRoom', { playerName: 'HostPlayer' });
    });
    socket1.on('roomCreated', (data) => {
      roomCode = data.data.roomCode;
      console.log('✅ Room created:', roomCode);
      console.log('📊 Host player details:', JSON.stringify(data.data.players[0], null, 2));
      resolve();
    });
  });

  // Test 2: Add second player
  console.log('2️⃣ Adding second player...');
  const socket2 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      socket2.emit('joinRoom', { roomCode, playerName: 'PlayerTwo' });
    });
    socket2.on('roomJoined', (data) => {
      console.log('✅ PlayerTwo joined');
      console.log('📊 All players:', JSON.stringify(data.data.players, null, 2));
      resolve();
    });
  });

  // Test 3: Host refreshes (disconnects)
  console.log('3️⃣ Host refreshes (disconnects)...');
  socket1.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Host rejoins with same name
  console.log('4️⃣ Host rejoins with same name...');
  const socket3 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket3.on('connect', () => {
      socket3.emit('joinRoom', { roomCode, playerName: 'HostPlayer' });
    });
    socket3.on('roomJoined', (data) => {
      console.log('✅ Host rejoined');
      console.log('📊 Players after host rejoin:', JSON.stringify(data.data.players, null, 2));
      resolve();
    });
  });

  // Test 5: PlayerTwo refreshes
  console.log('5️⃣ PlayerTwo refreshes...');
  socket2.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: PlayerTwo rejoins with same name
  console.log('6️⃣ PlayerTwo rejoins with same name...');
  const socket4 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket4.on('connect', () => {
      socket4.emit('joinRoom', { roomCode, playerName: 'PlayerTwo' });
    });
    socket4.on('roomJoined', (data) => {
      console.log('✅ PlayerTwo rejoined');
      console.log('📊 Final players:', JSON.stringify(data.data.players, null, 2));
      resolve();
    });
  });

  // Cleanup
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n🎉 Debug completed!');

  process.exit(0);
}

debugPlayerIdentity().catch((error) => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
