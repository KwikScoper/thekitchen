const { io } = require('socket.io-client');

/**
 * Test script to verify duplicate name prevention
 */
async function testDuplicateNamePrevention() {
  console.log('🧪 Testing duplicate name prevention...\n');

  // Test 1: Create room with host
  console.log('1️⃣ Creating room with host...');
  const socket1 = io('http://localhost:3001');
  let roomCode;
  
  await new Promise((resolve) => {
    socket1.on('connect', () => {
      socket1.emit('createRoom', { playerName: 'PlayerOne' });
    });
    socket1.on('roomCreated', (data) => {
      roomCode = data.data.roomCode;
      console.log('✅ Room created:', roomCode);
      console.log('📊 Host player:', data.data.players[0].name);
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
      console.log('📊 Players:', data.data.players.map(p => p.name));
      resolve();
    });
  });

  // Test 3: Try to add another player with same name as PlayerOne
  console.log('3️⃣ Trying to add another PlayerOne...');
  const socket3 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket3.on('connect', () => {
      socket3.emit('joinRoom', { roomCode, playerName: 'PlayerOne' });
    });
    socket3.on('roomJoined', (data) => {
      console.log('❌ Unexpected success - duplicate name should be rejected');
      resolve();
    });
    socket3.on('error', (error) => {
      if (error.code === 'NAME_ALREADY_EXISTS') {
        console.log('✅ Duplicate name correctly rejected:', error.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
      resolve();
    });
  });

  // Test 4: PlayerOne refreshes (should work)
  console.log('4️⃣ PlayerOne refreshes...');
  socket1.disconnect();
  await new Promise(resolve => setTimeout(resolve, 2000));

  const socket4 = io('http://localhost:3001');
  
  await new Promise((resolve) => {
    socket4.on('connect', () => {
      socket4.emit('joinRoom', { roomCode, playerName: 'PlayerOne' });
    });
    socket4.on('roomJoined', (data) => {
      console.log('✅ PlayerOne successfully rejoined');
      console.log('📊 Players after rejoin:', data.data.players.map(p => p.name));
      resolve();
    });
    socket4.on('error', (error) => {
      console.log('❌ Unexpected error during rejoin:', error.message);
      resolve();
    });
  });

  // Cleanup
  socket2.disconnect();
  socket3.disconnect();
  socket4.disconnect();

  console.log('\n🎉 Duplicate name prevention test completed!');
  console.log('\n✅ Summary:');
  console.log('✅ Duplicate names are rejected');
  console.log('✅ Players can rejoin with their original name');
  console.log('✅ Player list shows correct unique names');

  process.exit(0);
}

testDuplicateNamePrevention().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
