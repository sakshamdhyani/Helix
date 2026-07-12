const express = require('express');
const os = require('os');

const app = express();
const port = 8000;

// Middleware to log every request
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`
  );
  next();
});


app.get('/', (req, res) => {
    res.json({
        service: 'sample-app',
        hostname: os.hostname(),
        status: 'running',
        time: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)} seconds`,
    hostname: os.hostname(),
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
    },
    cpu: os.cpus().length,
    loadAverage: os.loadavg(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/crash', (req, res) => {
    res.send('Crashing...');
    process.exit(1);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});