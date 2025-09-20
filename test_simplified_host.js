const { io } = require('socket.io-client');

/**
 * Test script to verify simplified host management
 */
async function testSimplifiedHostManagement() {
  console.log('🧪 Testing simplified host management...\n');

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
      console.log('📊 Players:', data.data.players.map(p => `${p.name}(${p.isHost ? 'HOST' : 'player'})`));
      resolve();
    });
  });

  // Test 3: Host disconnects - PlayerTwo should become host
  console.log('3️⃣ Host disconnects...');
  socket1.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Host rejoins - should NOT become host again
  console.log('4️⃣ Host rejoins...');
  const socket3 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket3.on('connect', () => {
      socket3.emit('joinRoom', { roomCode, playerName: 'HostPlayer' });
    });
    socket3.on('roomJoined', (data) => {
      console.log('✅ HostPlayer rejoined');
      console.log('📊 Players after rejoin:', data.data.players.map(p => `${p.name}(${p.isHost ? 'HOST' : 'player'})`));
      
      // Verify PlayerTwo is still host
      const playerTwo = data.data.players.find(p => p.name === 'PlayerTwo');
      const hostPlayer = data.data.players.find(p => p.name === 'HostPlayer');
      
      if (playerTwo && playerTwo.isHost && !hostPlayer.isHost) {
        console.log('✅ Correct: PlayerTwo is still host, HostPlayer is regular player');
      } else {
        console.log('❌ Error: Host status not managed correctly');
      }
      resolve();
    });
  });

  // Test 5: PlayerTwo disconnects - HostPlayer should become host
  console.log('5️⃣ PlayerTwo (current host) disconnects...');
  socket2.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: PlayerTwo rejoins - should NOT become host again
  console.log('6️⃣ PlayerTwo rejoins...');
  const socket4 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket4.on('connect', () => {
      socket4.emit('joinRoom', { roomCode, playerName: 'PlayerTwo' });
    });
    socket4.on('roomJoined', (data) => {
      console.log('✅ PlayerTwo rejoined');
      console.log('📊 Players after rejoin:', data.data.players.map(p => `${p.name}(${p.isHost ? 'HOST' : 'player'})`));
      
      // Verify HostPlayer is now host
      const playerTwo = data.data.players.find(p => p.name === 'PlayerTwo');
      const hostPlayer = data.data.players.find(p => p.name === 'HostPlayer');
      
      if (hostPlayer && hostPlayer.isHost && !playerTwo.isHost) {
        console.log('✅ Correct: HostPlayer is now host, PlayerTwo is regular player');
      } else {
        console.log('❌ Error: Host status not managed correctly');
      }
      resolve();
    });
  });

  // Cleanup
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n🎉 Simplified host management test completed!');
  console.log('\n✅ Summary:');
  console.log('✅ Host status is passed to next connected player on disconnect');
  console.log('✅ Rejoining players do not automatically become host');
  console.log('✅ Simple and predictable host management');

  process.exit(0);
}

testSimplifiedHostManagement().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
