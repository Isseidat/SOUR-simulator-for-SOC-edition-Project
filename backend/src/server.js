import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { register, login } from './controllers/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const router = express.Router();

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Mock SOAR Backend is running' });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);

// Connect Database & Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[SOAR Backend Server] running on port ${PORT}`);
  });
});
