const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const secretPath = path.join(os.tmpdir(), 'imscca-socket-secret');
const loadSecret = () => {
  if (process.env.IMSCCA_SOCKET_SECRET?.length >= 32) return process.env.IMSCCA_SOCKET_SECRET;
  try {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) return existing;
    fs.unlinkSync(secretPath);
  }
  catch {
    // Creation is handled below so an invalid existing file is repaired too.
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(secretPath, generated, { flag: 'wx' }); return generated; }
  catch {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) return existing;
    throw new Error('Unable to initialize the Socket.IO shared secret.');
  }
};
const socketSecret = loadSecret();
const serviceOnly = (req, res, next) => {
  const supplied = String(req.get('X-IMSCCA-Socket-Secret') || '');
  const valid = supplied.length === socketSecret.length
    && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(socketSecret));
  if (!valid) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
};
const validRoomToken = (token, requestedClubId) => {
  const match = String(token || '').match(/^(\d+):(\d+):(\d+)\.([a-f0-9]{64})$/i);
  if (!match || Number(match[1]) !== Number(requestedClubId) || Number(match[3]) < Math.floor(Date.now() / 1000)) return false;
  const payload = `${match[1]}:${match[2]}:${match[3]}`;
  const expected = crypto.createHmac('sha256', socketSecret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(match[4]), Buffer.from(expected));
};
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
app.post('/notify-registration', serviceOnly, (req, res) => {
  const { role, fullName, clubId } = req.body;
  io.to(`club_${clubId}`).emit('registration', { role, fullName });
  res.json({ ok: true });
});

// New: Notify on deletion request status change
app.post('/notify-deletion-request-status', serviceOnly, (req, res) => {
  const { clubId, requestId, status, type, targetId, requestedBy, approvedBy, approvedAt } = req.body;
  io.to(`club_${clubId}`).emit('deletionRequestStatus', {
    requestId, status, type, targetId, requestedBy, approvedBy, approvedAt
  });
  res.json({ ok: true });
});

// When a dashboard connects, join their club room
io.on('connection', (socket) => {
  socket.on('joinClub', ({ clubId, token } = {}) => {
    if (validRoomToken(token, clubId)) socket.join(`club_${Number(clubId)}`);
  });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
