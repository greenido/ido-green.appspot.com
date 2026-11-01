# Pull-Ups Challenge Tracker

A React-based web application for tracking pull-ups performance with live camera integration.

## Features

- 🎥 **Live Camera Tracking**: Uses device camera for real-time monitoring
- 👥 **Multi-Player Support**: Add multiple players and track their performance
- 🏆 **Live Leaderboard**: Real-time ranking with medal indicators
- 📊 **Score Management**: Easy increment/decrement controls
- 🎮 **Player Rotation**: Navigate between players during workout sessions
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Reset Functionality**: Clear all scores to start fresh

## How to Serve as Static Page

### Option 1: Simple HTTP Server (Python)
```bash
# Navigate to the www directory
cd /Applications/MAMP/htdocs/ido-green.appspot.com/ido-green/www

# Python 3
python -m http.server 8000

# Python 2 (if python3 not available)
python -m SimpleHTTPServer 8000

# Access at: http://localhost:8000/pull-ups-game.html
```

### Option 2: Live Server (VS Code Extension)
1. Install "Live Server" extension in VS Code
2. Right-click on `pull-ups-game.html`
3. Select "Open with Live Server"

### Option 3: Using MAMP (Current Setup)
Since you're already using MAMP:
1. Ensure MAMP is running
2. Access: `http://localhost/ido-green.appspot.com/ido-green/www/pull-ups-game.html`

### Option 4: Netlify/Vercel Deployment
1. **Netlify**: Drag and drop the `pull-ups-game.html` file to https://app.netlify.com/drop
2. **Vercel**: Use `vercel --prod` in the directory
3. **GitHub Pages**: Push to a GitHub repo and enable Pages

## Camera Permissions

⚠️ **Important**: The app requires camera permissions to function properly. 

- **HTTPS Required**: Most browsers require HTTPS for camera access (except localhost)
- **User Interaction**: Camera access must be triggered by user interaction
- **Permissions**: Allow camera access when prompted

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+  
- ✅ Safari 11+
- ✅ Edge 79+

## Usage

1. **Add Players**: Enter player names and click "Add"
2. **Enable Camera**: Click "Enable Camera" and grant permissions
3. **Start Tracking**: Click "Start Tracking" to begin
4. **Track Pull-ups**: Use +/- buttons to adjust scores
5. **Switch Players**: Use Previous/Next buttons or click player names
6. **View Leaderboard**: Real-time ranking on the right panel

## Technical Details

- **React 18**: Using CDN version for simplicity
- **Tailwind CSS**: For responsive styling
- **HTML5 Video API**: For camera integration
- **LocalStorage**: Could be added for persistence
- **No Build Step**: Pure HTML file with CDN dependencies

## Customization

The app uses inline styles and CDN resources, making it easy to customize:
- Colors: Modify Tailwind classes
- Icons: Replace SVG icon components
- Layout: Adjust grid and flexbox classes
- Functionality: Edit JavaScript functions