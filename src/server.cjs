const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  try {
    const { hostname } = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(hostname)
      || hostname.endsWith('.devtunnels.ms');
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  callback(null, isAllowedOrigin(origin));
};

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Listen for PHP POSTs
app.post('/notify-registration', (req, res) => {
  const { role, fullName, clubId } = req.body;
  io.to(`club_${clubId}`).emit('registration', { role, fullName });
  res.json({ ok: true });
});

// New: Notify on deletion request status change
app.post('/notify-deletion-request-status', (req, res) => {
  const { clubId, requestId, status, type, targetId, requestedBy, approvedBy, approvedAt } = req.body;
  io.to(`club_${clubId}`).emit('deletionRequestStatus', {
    requestId, status, type, targetId, requestedBy, approvedBy, approvedAt
  });
  res.json({ ok: true });
});

// When a dashboard connects, join their club room
io.on('connection', (socket) => {
  socket.on('joinClub', (clubId) => {
    socket.join(`club_${clubId}`);
  });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
