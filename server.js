const express = require('express');
const { execFile } = require('child_process');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.get('/report.html', (req, res) => {
  res.sendFile('report.html', { root: __dirname });
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

app.post('/api/ccusage-models', (req, res) => {
  execFile('npx', ['-y', 'ccusage@latest', 'session', '--json'], { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    try {
      const parsed = JSON.parse(stdout);
      const sessions = parsed.session || [];
      const byModel = new Map();

      for (const s of sessions) {
        const breakdowns = s.modelBreakdowns || [];
        const seenInSession = new Set();
        for (const b of breakdowns) {
          const name = b.modelName || 'unknown';
          if (!byModel.has(name)) {
            byModel.set(name, {
              name, sessions: 0, inputTokens: 0, outputTokens: 0,
              cacheReadTokens: 0, cacheCreationTokens: 0, cost: 0
            });
          }
          const m = byModel.get(name);
          m.inputTokens += b.inputTokens || 0;
          m.outputTokens += b.outputTokens || 0;
          m.cacheReadTokens += b.cacheReadTokens || 0;
          m.cacheCreationTokens += b.cacheCreationTokens || 0;
          m.cost += b.cost || 0;
          if (!seenInSession.has(name)) { m.sessions += 1; seenInSession.add(name); }
        }
      }

      const models = Array.from(byModel.values()).map(m => {
        m.totalTokens = m.inputTokens + m.outputTokens + m.cacheReadTokens + m.cacheCreationTokens;
        m.costPer1kTokens = m.totalTokens ? (m.cost / m.totalTokens) * 1000 : 0;
        m.avgTokensPerSession = m.sessions ? m.totalTokens / m.sessions : 0;
        m.avgCostPerSession = m.sessions ? m.cost / m.sessions : 0;
        m.outputRatio = m.inputTokens ? m.outputTokens / m.inputTokens : 0;
        return m;
      });

      models.sort((a, b) => b.totalTokens - a.totalTokens);
      res.json(models);
    } catch (e) {
      res.status(500).json({ error: 'parse fail: ' + e.message });
    }
  });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});