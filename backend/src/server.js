import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { initCronJobs } from './jobs/cronJobs.js';
import { seedDefaultUsers } from './services/authService.js';


const app = express();
const PORT = config.app.port;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Healthcheck route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Mock SOAR Backend is running' });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Connect Database & Start Server
connectDB().then(async () => {
  // Tự động kiểm tra và seed 2 tài khoản mẫu nếu hệ thống mới
  await seedDefaultUsers();

  app.listen(PORT, () => {
    console.log(`[SOAR Backend Server] running on port ${PORT}`);
    
    // Khởi động hệ thống chạy ngầm Cron Jobs
    initCronJobs();
  });
});
