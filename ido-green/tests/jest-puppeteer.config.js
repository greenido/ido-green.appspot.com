//
// Boots the local static server before the suite so the smoke tests run
// against the working tree rather than the deployed site.
//
module.exports = {
  launch: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  server: {
    command: 'node static-server.js',
    port: 8080,
    launchTimeout: 30000,
    debug: true
  }
};
