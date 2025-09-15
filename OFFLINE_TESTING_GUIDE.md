# Offline System Testing Guide

## Quick Test Scenarios

### 1. **Basic Offline Detection**

1. Start your app normally (should show online state)
2. Enable Airplane Mode
3. **Expected**: Offline banner appears at top, header shows offline indicator
4. Disable Airplane Mode
5. **Expected**: Banner disappears, indicator shows online state

### 2. **Home Screen Offline Experience**

1. Open the Home tab
2. Enable Airplane Mode
3. **Expected**:
   - Offline banner at top
   - If no cached products: Shows offline placeholder with "You're Offline" message
   - If cached products: Shows cached content with offline indicators

### 3. **Sell Screen Retry Queue**

1. Fill out a product form on Sell tab
2. Enable Airplane Mode
3. Try to submit the product
4. **Expected**: Error message about being offline
5. Disable Airplane Mode
6. **Expected**: Product submission retries automatically

### 4. **Header Connectivity Indicator**

1. Navigate to any screen with a header
2. Enable Airplane Mode
3. **Expected**: Small offline indicator appears in header
4. Connect to slow WiFi (2G/3G simulation)
5. **Expected**: Indicator shows slow connection state

### 5. **Retry Queue Functionality**

1. Go offline
2. Try multiple actions that require network (browse, search, etc.)
3. **Expected**: Actions are queued silently
4. Go back online
5. **Expected**: Queued actions execute automatically

## Advanced Testing

### Network Throttling (iOS Simulator)

```bash
# In iOS Simulator menu: Device > Network Link Conditioner
# Select "Very Bad Network" or "High Latency DNS"
```

### Network Throttling (Android Emulator)

```bash
# In Android Studio: Extended Controls > Network
# Set to "Slow 2G" or "Offline"
```

### Manual Network Interruption

1. Start a network operation (like loading products)
2. Quickly enable Airplane Mode mid-operation
3. **Expected**: Operation fails gracefully with offline handling

## Expected Behaviors

### ✅ Online State

- No offline banner
- No connectivity indicators
- All network operations work normally
- Retry queue is empty

### ✅ Offline State

- Orange offline banner at top of screen
- Offline indicator in headers
- Network operations show offline messages
- Failed operations added to retry queue
- Cached content still accessible

### ✅ Slow Connection

- No banner (still connected)
- Slow connection indicator in headers
- Operations may take longer but still work
- Retry logic activates for timeouts

### ✅ Connection Recovery

- Offline banner disappears
- Indicators return to online state
- Retry queue executes automatically
- Fresh data loads

## Debug Information

Check your console logs for:

- `"Connectivity changed: OFFLINE/ONLINE"`
- `"Operation queued for retry when online"`
- `"Executing retry queue"`
- `"Connection restored, executing retry queue"`

## Troubleshooting

### Offline Banner Not Showing

- Check if `OfflineProvider` wraps your app in `_layout.tsx`
- Verify `useOffline` hook is being used correctly

### Retry Queue Not Working

- Ensure `addToRetryQueue` is called with async functions
- Check if `executeRetryQueue` is called when connection returns

### UI Components Not Styled

- Verify theme imports are correct
- Check if `useColors` hook is working

### Performance Issues

- Monitor retry queue length in logs
- Check for memory leaks in connectivity listeners

## Production Testing

### Real Device Testing

1. Test on actual devices (not just simulators)
2. Try different network conditions (WiFi, cellular, weak signal)
3. Test network switching (WiFi to cellular)
4. Test background/foreground transitions while offline

### Edge Cases

1. App launch while offline
2. Network loss during critical operations
3. Multiple rapid network state changes
4. Low memory conditions with large retry queues

## Success Criteria

Your offline system is working correctly if:

- ✅ Users can browse cached content when offline
- ✅ Offline state is clearly communicated
- ✅ Failed operations retry when connection returns
- ✅ UI remains responsive during network issues
- ✅ No crashes or freezes during network transitions
- ✅ Consistent offline experience across all screens

## Next Steps

Once testing is complete:

1. Monitor user feedback for offline experience
2. Add more sophisticated caching strategies
3. Implement offline data synchronization
4. Add offline-specific features (draft saving, etc.)
5. Optimize retry queue management for better performance

Happy testing! 🚀
