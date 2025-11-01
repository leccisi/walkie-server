// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const app = express();

// Basic CORS support
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Health check & root
app.get('/', (_req, res) => {
  res.type('text/plain').send('WebRTC signaling server is running.');
});

// Create HTTP + WS server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {}; // { roomId: Set<ws> }

function heartbeat() { this.isAlive = true; }

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (message) => {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    if (data.join) {
      const room = data.join;
      rooms[room] ??= new Set();
      rooms[room].add(ws);
      ws.room = room;
      return;
    }

    if (ws.room && rooms[ws.room]) {
      for (const client of rooms[ws.room]) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      }
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) delete rooms[ws.room];
    }
  });
});

// Keep-alive pings
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

// Bind to 0.0.0.0 for Render
server.listen(PORT, HOST, () => {
  console.log(`Signaling server listening on http://${HOST}:${PORT}`);
});
