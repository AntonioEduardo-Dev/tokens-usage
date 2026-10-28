const express = require('express');
const { execFile } = require('child_process');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.post('/api/ccusage-daily', (req, res) => {
  execFile('npx', ['-y', 'ccusage@latest', 'daily', '--json'], { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    try {
      const parsed = JSON.parse(stdout);
      res.json(parsed.daily || []);
    } catch (e) {
      res.status(500).json({ error: 'parse fail: ' + e.message });
    }
  });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});