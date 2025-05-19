const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST']
  }
});

// Listen for PHP POSTs
app.post('/notify-registration', (req, res) => {
  const { role, fullName, clubId } = req.body;
  io.to(`club_${clubId}`).emit('registration', { role, fullName });
  res.json({ ok: true });
});

// When a dashboard connects, join their club room
io.on('connection', (socket) => {
  socket.on('joinClub', (clubId) => {
    socket.join(`club_${clubId}`);
  });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
