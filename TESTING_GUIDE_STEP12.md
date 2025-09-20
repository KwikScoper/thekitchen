# Step 12: Room Page Testing Guide

## Overview
This guide provides comprehensive testing scenarios for the RoomPage component implementation. The tests cover all functionality, edge cases, and integration points.

## Prerequisites
- Frontend running on http://localhost:5174
- Backend running on http://localhost:3001
- MongoDB running locally
- Multiple browser tabs/windows for multi-player testing

## Testing Scenarios

### 1. Basic Room Page Functionality

#### Test 1.1: Room Page Load
**Steps:**
1. Open http://localhost:5174
2. Create a room with name "Test Host"
3. Verify RoomPage loads correctly
4. Check room code is displayed prominently
5. Verify connection status shows "Connected"

**Expected Results:**
- ✅ RoomPage loads with room code displayed
- ✅ Connection status shows green "Connected"
- ✅ Game state shows "lobby"
- ✅ Player list shows host player
- ✅ Host controls are visible

#### Test 1.2: Navigation
**Steps:**
1. From RoomPage, click "Leave Room"
2. Verify return to HomePage
3. Rejoin the same room
4. Verify RoomPage loads again

**Expected Results:**
- ✅ "Leave Room" button works
- ✅ Returns to HomePage
- ✅ Can rejoin room successfully
- ✅ RoomPage loads with correct data

### 2. Socket.IO Integration Testing

#### Test 2.1: Real-time Updates
**Steps:**
1. Open RoomPage in Tab 1
2. Open HomePage in Tab 2
3. Join room from Tab 2
4. Verify Tab 1 updates automatically

**Expected Results:**
- ✅ Tab 1 shows new player immediately
- ✅ Player count updates
- ✅ Success message appears
- ✅ No page refresh needed

#### Test 2.2: Connection Management
**Steps:**
1. Open RoomPage
2. Disconnect internet briefly
3. Reconnect internet
4. Verify reconnection

**Expected Results:**
- ✅ Connection status shows "Disconnected" when offline
- ✅ Connection status shows "Connected" when online
- ✅ Room data persists through disconnection
- ✅ Automatic reconnection works

### 3. Game State Management Testing

#### Test 3.1: Lobby Phase
**Steps:**
1. Create room as host
2. Join with second player
3. Verify lobby state

**Expected Results:**
- ✅ Shows "Waiting for Players" message
- ✅ Displays room code prominently
- ✅ Shows player list with host indicator
- ✅ "Start Game" button visible to host only
- ✅ Shows "Need at least 2 players to start" when < 2 players

#### Test 3.2: Game Start (Host Only)
**Steps:**
1. Host clicks "Start Game"
2. Verify game state changes
3. Test non-host trying to start game

**Expected Results:**
- ✅ Game state changes to "submitting"
- ✅ AI prompt appears
- ✅ Timer starts counting down
- ✅ Non-host cannot start game
- ✅ Success message appears

#### Test 3.3: Submitting Phase
**Steps:**
1. Start game as host
2. Verify submitting phase UI
3. Test timer functionality
4. Test image submission

**Expected Results:**
- ✅ Shows "Cooking Time!" header
- ✅ AI prompt displayed prominently
- ✅ Timer counts down from 5:00
- ✅ Shows submission progress for all players
- ✅ "Submit Image" button works
- ✅ Shows "Submitted" status after submission

#### Test 3.4: Voting Phase
**Steps:**
1. Complete submitting phase
2. Verify voting phase UI
3. Test vote casting
4. Test voting progress

**Expected Results:**
- ✅ Shows "Vote for Your Favorite!" header
- ✅ Displays submission grid
- ✅ Vote buttons work
- ✅ Vote counts update in real-time
- ✅ Shows voting progress for all players
- ✅ Timer counts down from 2:00

#### Test 3.5: Results Phase
**Steps:**
1. Complete voting phase
2. Verify results display
3. Test play again functionality

**Expected Results:**
- ✅ Shows "Game Results!" header
- ✅ Displays winner with trophy
- ✅ Shows vote counts for all players
- ✅ "Play Again" button visible to host
- ✅ Results are accurate

### 4. Multi-Player Testing

#### Test 4.1: Multiple Players
**Steps:**
1. Open 3+ browser tabs
2. Create room in Tab 1
3. Join room in Tabs 2 and 3
4. Start game
5. Test all phases with multiple players

**Expected Results:**
- ✅ All tabs show same room data
- ✅ Real-time updates work across all tabs
- ✅ Game state synchronized
- ✅ Player actions visible to all
- ✅ Voting works correctly

#### Test 4.2: Player Disconnection
**Steps:**
1. Start game with 3 players
2. Close one tab during game
3. Verify remaining players see disconnection
4. Continue game with remaining players

**Expected Results:**
- ✅ Disconnected player removed from list
- ✅ Success message about player leaving
- ✅ Game continues with remaining players
- ✅ No errors or crashes

### 5. Error Handling Testing

#### Test 5.1: Invalid Actions
**Steps:**
1. Try to start game with < 2 players
2. Try to submit image before game starts
3. Try to vote before voting phase
4. Try to vote for own submission

**Expected Results:**
- ✅ Appropriate error messages
- ✅ Buttons disabled when invalid
- ✅ No crashes or errors
- ✅ Clear user feedback

#### Test 5.2: Network Errors
**Steps:**
1. Start game
2. Disconnect internet
3. Try to perform actions
4. Reconnect and verify recovery

**Expected Results:**
- ✅ Error messages for network issues
- ✅ Graceful handling of disconnection
- ✅ Recovery when reconnected
- ✅ No data loss

### 6. UI/UX Testing

#### Test 6.1: Responsive Design
**Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify all elements visible and functional

**Expected Results:**
- ✅ Layout adapts to screen size
- ✅ All buttons accessible
- ✅ Text readable on all sizes
- ✅ No horizontal scrolling

#### Test 6.2: Visual Feedback
**Steps:**
1. Test loading states
2. Test success messages
3. Test error messages
4. Test hover effects

**Expected Results:**
- ✅ Loading states show during actions
- ✅ Success messages appear and auto-dismiss
- ✅ Error messages clear and helpful
- ✅ Hover effects work on interactive elements

### 7. Performance Testing

#### Test 7.1: Multiple Rooms
**Steps:**
1. Create multiple rooms simultaneously
2. Test with 5+ concurrent rooms
3. Verify no performance degradation

**Expected Results:**
- ✅ Multiple rooms work independently
- ✅ No memory leaks
- ✅ Performance remains good
- ✅ No cross-room interference

#### Test 7.2: Long Session
**Steps:**
1. Keep room open for 30+ minutes
2. Play multiple game rounds
3. Verify stability

**Expected Results:**
- ✅ No memory leaks
- ✅ Performance remains stable
- ✅ All functionality works
- ✅ No crashes or errors

## Automated Testing Script

Run this script to test basic functionality:

```bash
# Test script for Step 12
node test_step12_automated.js
```

## Manual Testing Checklist

### Basic Functionality
- [ ] RoomPage loads correctly
- [ ] Room code displayed prominently
- [ ] Connection status shows correctly
- [ ] Player list updates in real-time
- [ ] Host controls work properly
- [ ] Leave room functionality works

### Game States
- [ ] Lobby phase displays correctly
- [ ] Game start works (host only)
- [ ] Submitting phase with timer
- [ ] Voting phase with submissions
- [ ] Results phase with winner
- [ ] State transitions work smoothly

### Multi-Player
- [ ] Multiple players can join
- [ ] Real-time updates work
- [ ] Game synchronization works
- [ ] Player disconnection handled
- [ ] Voting works correctly

### Error Handling
- [ ] Invalid actions show errors
- [ ] Network errors handled gracefully
- [ ] Error messages are clear
- [ ] Recovery works properly

### UI/UX
- [ ] Responsive design works
- [ ] Visual feedback is clear
- [ ] Loading states work
- [ ] Success/error messages work
- [ ] Hover effects work

## Common Issues and Solutions

### Issue: RoomPage doesn't load
**Solution:** Check browser console for errors, verify backend is running

### Issue: Real-time updates not working
**Solution:** Check Socket.IO connection, verify network connectivity

### Issue: Game state not updating
**Solution:** Check socket events, verify backend game logic

### Issue: Timer not working
**Solution:** Check timer state management, verify useEffect cleanup

### Issue: Host controls not visible
**Solution:** Check isHost state, verify player data structure

## Success Criteria

The implementation is successful when:
- ✅ All basic functionality works
- ✅ All game states render correctly
- ✅ Multi-player functionality works
- ✅ Real-time updates work
- ✅ Error handling works
- ✅ UI/UX is responsive and intuitive
- ✅ Performance is good
- ✅ No crashes or errors

## Next Steps After Testing

Once testing is complete:
1. Document any issues found
2. Fix any bugs discovered
3. Optimize performance if needed
4. Prepare for Step 13: Lobby Component
5. Update progress tracking with test results
