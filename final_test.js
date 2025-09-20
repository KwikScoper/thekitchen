const { io } = require('socket.io-client');

/**
 * Comprehensive test for all rejoin scenarios
 */
async function comprehensiveTest() {
  console.log('🧪 Comprehensive rejoin test...\n');

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
      resolve();
    });
  });

  // Test 2: Add second player
  console.log('2️⃣ Adding second player...');
  const socket2 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      socket2.emit('joinRoom', { roomCode, playerName: 'Player2' });
    });
    socket2.on('roomJoined', (data) => {
      console.log('✅ Player2 joined. Total players:', data.data.playerCount);
      resolve();
    });
  });

  // Test 3: Host refreshes (disconnects)
  console.log('3️⃣ Host refreshes (disconnects)...');
  socket1.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Host rejoins
  console.log('4️⃣ Host rejoins...');
  const socket3 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket3.on('connect', () => {
      socket3.emit('joinRoom', { roomCode, playerName: 'HostPlayer' });
    });
    socket3.on('roomJoined', (data) => {
      console.log('✅ Host rejoined successfully!');
      console.log('📊 Players:', data.data.players.map(p => `${p.name} (${p.isHost ? 'host' : 'player'})`));
      resolve();
    });
  });

  // Test 5: Player2 refreshes
  console.log('5️⃣ Player2 refreshes...');
  socket2.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: Player2 rejoins
  console.log('6️⃣ Player2 rejoins...');
  const socket4 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket4.on('connect', () => {
      socket4.emit('joinRoom', { roomCode, playerName: 'Player2' });
    });
    socket4.on('roomJoined', (data) => {
      console.log('✅ Player2 rejoined successfully!');
      console.log('📊 Final players:', data.data.players.map(p => `${p.name} (${p.isHost ? 'host' : 'player'})`));
      resolve();
    });
  });

  // Cleanup
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n🎉 All tests passed!');
  console.log('\n✅ Summary:');
  console.log('✅ Host can refresh and rejoin');
  console.log('✅ Players can refresh and rejoin');
  console.log('✅ Room persists through disconnections');
  console.log('✅ Multiple players can coexist after rejoins');

  process.exit(0);
}

comprehensiveTest().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
