import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Tự động tìm và nạp file .env (hỗ trợ cả chạy qua Docker lẫn chạy local)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// 2. Kiểm tra fail-fast: Nếu thiếu khóa bảo mật quan trọng, dừng server ngay để bảo vệ hệ thống
const requiredEnvs = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const envKey of requiredEnvs) {
  if (!process.env[envKey]) {
    console.error(`[Config Error]: Thiếu biến môi trường bắt buộc: ${envKey}`);
    process.exit(1);
  }
}

// 3. Xuất đối tượng config gom nhóm sạch sẽ
export const config = {
  app: {
    port: Number(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/soar_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  n8n: {
    baseUrl: process.env.N8N_LOCAL_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    masterWorkflowId: process.env.N8N_MASTER_WORKFLOW_ID || 'ay2nW4EWg2uAcjJL',
    webhookSecret: process.env.WEBHOOK_SECRET || 'mock_soar_secret_123',
    fallbackUrls: [
      process.env.N8N_LOCAL_URL,
      'http://localhost:5678',
      'http://soar_n8n:5678',
      'http://host.docker.internal:5678',
    ].filter(Boolean),
  },
  mail: {
    user: process.env.EMAIL_USER || '',
    pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
    managerEmail: process.env.MANAGER_EMAIL || '',
    ccEmail: process.env.CC_EMAIL || 'perosz4153@gmail.com',
    host: 'smtp.gmail.com',
    port: 465,
  },
};