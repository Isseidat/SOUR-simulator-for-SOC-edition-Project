import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { initCronJobs } from './jobs/cronJobs.js';
import { seedDefaultUsers } from './services/authService.js';
import { seedDefaultEmailTemplates } from './services/templateService.js';
import { logger, httpLogger } from './utils/logger.js';


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
app.use(httpLogger);
app.use('/api/v1', apiRoutes);
app.use((err, req, res, _next) => {
  (req.log || logger).error({ err }, 'Unhandled HTTP error');
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
});


process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception - exiting');
  process.exit(1);
});

// Connect Database & Start Server
connectDB().then(async () => {
  // Tự động kiểm tra và seed 2 tài khoản mẫu nếu hệ thống mới
  await seedDefaultUsers();
  // Tự động khởi tạo 10 mẫu EmailTemplate vào MongoDB nếu chưa có
  await seedDefaultEmailTemplates();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'SOAR Backend Server started');
    initCronJobs();
  });
});
