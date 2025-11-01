const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => res.send('WebRTC signaling server is running.'));

let rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.join) {
        const room = data.join;
        if (!rooms[room]) rooms[room] = new Set();
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
    } catch (err) {
      console.error('Invalid message:', err);
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) delete rooms[ws.room];
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Signaling server listening on port ${PORT}`));
