# 🏋️ Camera & Pull-Up Detection Test

## Overview
Enhanced camera test page with pull-up detection capabilities from the pull-ups-game.html. This page allows you to test the pull-up detection algorithm with both live camera and uploaded images.

## Features

### 1. **Live Camera Testing**
- Start camera with back/front camera selection
- Real-time pull-up detection overlay
- Visual feedback with bounding boxes and skeleton tracking
- Toggle detection on/off during recording
- Frame counter and user name display

### 2. **Image Upload Testing** 🆕
- Upload photos of people doing pull-ups
- Analyze static images for pull-up position detection
- Detailed statistics display showing:
  - Pull-up state (UP/DOWN/UNKNOWN)
  - Shoulder and wrist Y positions
  - Arm angles (left, right, average)
  - Detection criteria status
- Drag & drop support

### 3. **Detection Algorithm** 🆕
Imported from `pull-ups-game.html`, the detection uses:
- **MediaPipe Pose** for body landmark detection
- **Multi-factor analysis:**
  - Wrist position relative to shoulders
  - Arm angle calculations (elbow angles)
  - Extended arms (>140°) = DOWN position
  - Bent arms (<100°) + wrists above shoulders = UP position

## How to Use

### Live Camera Test:
1. Enter your name (optional but saved automatically)
2. Click "Start Camera (Back)" to begin
3. Click "Enable Pull-Up Detection" to activate detection
4. Perform pull-ups in front of the camera
5. Watch real-time detection with visual overlays

### Image Upload Test:
1. Scroll to "Test with Image Upload" section
2. Click the upload area or drag & drop an image
3. Click "🔍 Analyze Image for Pull-Up Position"
4. View detailed detection statistics below

## Detection Statistics Explained

| Metric | Description | UP Position | DOWN Position |
|--------|-------------|-------------|---------------|
| **Shoulder Y** | Vertical position of shoulders | Lower value (higher on screen) | Higher value |
| **Wrist Y** | Vertical position of wrists | Lower than shoulders | Higher than shoulders |
| **Arm Angle** | Elbow angle in degrees | < 100° (bent) | > 140° (extended) |
| **Wrists Above Shoulders** | Boolean check | ✅ Yes | ❌ No |
| **Arms Extended** | Angle > 140° | ❌ No | ✅ Yes |
| **Arms Bent** | Angle < 100° | ✅ Yes | ❌ No |

## Tips for Testing

### For Best Results:
- **Camera position:** Place camera at chest/shoulder height
- **Distance:** Stand 6-10 feet away from camera
- **Lighting:** Ensure good, even lighting
- **Background:** Clear background helps detection
- **Full body visibility:** Make sure shoulders, elbows, and wrists are visible

### For Image Testing:
- Use images with clear, full-body view
- Side view or front view both work
- Person should be the main subject
- High-resolution images work better

## Troubleshooting

### No Pose Detected
- Ensure the person is fully visible in frame
- Check lighting conditions
- Try adjusting distance from camera
- Make sure MediaPipe libraries loaded (check console)

### Detection Not Working
- Click "Enable Pull-Up Detection" button
- Check browser console for errors
- Verify MediaPipe Pose loaded successfully
- Try refreshing the page

### Camera Permission Issues
- Grant camera permission when prompted
- Check browser settings if blocked
- Try a different browser if problems persist

## Technical Details

### Dependencies:
- **MediaPipe Pose** - Body landmark detection
- **Canvas API** - Drawing overlays
- **getUserMedia API** - Camera access

### Key Functions:
- `detectPullUp(landmarks)` - Analyzes pose landmarks to determine pull-up state
- `drawPoseLandmarks(ctx, landmarks)` - Draws visual overlays on canvas
- `onPoseResults(results)` - Handles MediaPipe detection results
- `analyzeImage()` - Processes uploaded images

### Detection Thresholds:
```javascript
const wristAboveShoulder = wristY < shoulderY - 0.05;
const armsExtended = avgArmAngle > 140;
const armsBent = avgArmAngle < 100;
```

## Files Modified
- `camera-test.html` - Enhanced with pull-up detection from pull-ups-game.html

## Future Enhancements
- [ ] Rep counter for live camera
- [ ] Export detection data as JSON
- [ ] Batch image analysis
- [ ] Adjustable detection sensitivity
- [ ] Save analysis results

## Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ Mobile browsers (may have performance differences)

---
**Version:** 1.0.0  
**Last Updated:** November 2, 2025  
**Based on:** pull-ups-game.html detection algorithm
