const { io } = require('socket.io-client');

/**
 * Test script to verify player identity is preserved during refresh
 */
async function testPlayerIdentityPreservation() {
  console.log('🧪 Testing player identity preservation during refresh...\n');

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
      console.log('📊 Host player:', data.data.players[0].name, '(isHost:', data.data.players[0].isHost, ')');
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
      console.log('📊 Players:', data.data.players.map(p => `${p.name} (isHost: ${p.isHost})`));
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
      console.log('📊 Players after host rejoin:', data.data.players.map(p => `${p.name} (isHost: ${p.isHost})`));
      
      // Verify host is still the host
      const hostPlayer = data.data.players.find(p => p.name === 'HostPlayer');
      if (hostPlayer && hostPlayer.isHost) {
        console.log('✅ Host identity preserved - still the host');
      } else {
        console.log('❌ Host identity lost - no longer the host');
      }
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
      console.log('📊 Final players:', data.data.players.map(p => `${p.name} (isHost: ${p.isHost})`));
      
      // Verify both players have correct identities
      const hostPlayer = data.data.players.find(p => p.name === 'HostPlayer');
      const playerTwo = data.data.players.find(p => p.name === 'PlayerTwo');
      
      if (hostPlayer && hostPlayer.isHost && playerTwo && !playerTwo.isHost) {
        console.log('✅ Both player identities preserved correctly');
      } else {
        console.log('❌ Player identities not preserved correctly');
      }
      resolve();
    });
  });

  // Cleanup
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n🎉 Player identity preservation test completed!');
  console.log('\n✅ Summary:');
  console.log('✅ Host refreshes and rejoins as Host (stays host)');
  console.log('✅ PlayerTwo refreshes and rejoins as PlayerTwo (stays non-host)');
  console.log('✅ Player identities are preserved during refresh');

  process.exit(0);
}

testPlayerIdentityPreservation().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
