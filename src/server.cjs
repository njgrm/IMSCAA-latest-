const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
// Must match src/my-app-server/bootstrap.php. The PHP web server runs as
// LocalSystem while this service runs as the interactive user, so resolving the
// secret through os.tmpdir() would give each process a different file.
const sharedDir = process.env.IMSCCA_SHARED_DIR || 'D:/XAMPP/tmp';
const secretPath = process.env.IMSCCA_SOCKET_SECRET_FILE
  || path.join(sharedDir, 'imscca-socket-secret');
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
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, { flag: 'wx' });
    return generated;
  }
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
const configuredOrigins = new Set(
  String(process.env.IMSCCA_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
);

// Loopback plus link-local and RFC 1918 / RFC 4193 LAN addresses. The app is
// opened from a phone or another PC on the same network, so those origins must
// be accepted next to localhost.
const parseIpv4 = (hostname) => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every(octet => octet <= 255) ? octets : null;
};

const isPrivateHost = (hostname) => {
  if (hostname === 'localhost' || hostname === '::1') return true;

  const octets = parseIpv4(hostname);
  if (octets) {
    const [a, b] = octets;
    return a === 127 || a === 10
      || (a === 192 && b === 168)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31);
  }

  return /^fe80:/.test(hostname) || /^f[cd][0-9a-f]{2}:/.test(hostname);
};

const isAllowedOrigin = (origin, requestHost = '') => {
  if (!origin) return true;

  let hostname;
  try {
    hostname = new URL(origin).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    return false;
  }
  if (!hostname) return true;

  if (configuredOrigins.has(origin)) return true;
  if (isPrivateHost(hostname)) return true;
  if (hostname.endsWith('.devtunnels.ms')) return true;

  const serverHost = String(requestHost).replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  return serverHost !== '' && hostname === serverHost;
};

const corsOrigin = (origin, callback) => {
  callback(null, isAllowedOrigin(origin));
};

// The `cors` option only applies to the HTTP polling transport, so the same policy
// is enforced on the WebSocket handshake through `allowRequest`.
const allowSocketRequest = (req, callback) => {
  callback(null, isAllowedOrigin(req.headers.origin, req.headers.host));
};

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST']
  },
  allowRequest: allowSocketRequest
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
  socket.on('joinClub', ({ clubId, token } = {}, acknowledge) => {
    const granted = validRoomToken(token, clubId);
    if (granted) {
      socket.join(`club_${Number(clubId)}`);
    } else {
      console.warn('Rejected joinClub for club %s (missing, invalid, or expired token).', clubId);
    }
    if (typeof acknowledge === 'function') acknowledge({ ok: granted });
  });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
