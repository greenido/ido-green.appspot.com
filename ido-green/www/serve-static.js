const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the pull-ups game at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pull-ups-game.html'));
});

// Fallback for any other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'pull-ups-game.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Pull-ups game server running at http://localhost:${PORT}`);
    console.log(`📱 Make sure to allow camera permissions for full functionality`);
});