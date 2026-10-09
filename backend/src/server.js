import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { register, login } from './controllers/authController.js';
import { initCronJobs } from './jobs/cronJobs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const router = express.Router();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Mock SOAR Backend is running' });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Connect Database & Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[SOAR Backend Server] running on port ${PORT}`);
    
    // Khởi động hệ thống chạy ngầm Cron Jobs
    initCronJobs();
  });
});
