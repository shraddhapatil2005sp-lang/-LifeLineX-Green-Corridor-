const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

const { seedDatabase } = require('./seeds/seedData');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const tripRoutes = require('./routes/tripRoutes');
const auditRoutes = require('./routes/auditRoutes');
const initSocket = require('./socket/socketHandler');

// Initialize database schema and seeds
seedDatabase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io instance to app
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for now
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/locations', hospitalRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/audit-logs', auditRoutes);

// Catch-all fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Setup WebSockets
initSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Green Corridor Management System is live!`);
  console.log(`📍 Web App & API running on: http://localhost:${PORT}`);
  console.log(`🗄️ Database: SQLite (data/greencorridor.db)`);
  console.log(`⚡ WebSocket Server: Ready for live telemetry`);
  console.log(`=======================================================`);
});
