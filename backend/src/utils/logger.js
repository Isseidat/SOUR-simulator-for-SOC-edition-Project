import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { notifyTelegramOnError } from '../clients/telegramClient.js';

const formatVnTimestamp = () => {
  const vnIso = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');
  return `,"time":"${vnIso}"`;
};

const attachUserContext = (req, val) => ({
  ...val,
  userId: req.user?.id || null,
  userRole: req.user?.role || null,
});

const parsePinoArgs = (inputArgs = []) => {
  const [first, second] = inputArgs;
  if (first instanceof Error) {
    return { obj: { err: first }, msg: typeof second === 'string' ? second : first.message };
  }
  if (first && typeof first === 'object') {
    return { obj: first, msg: typeof second === 'string' ? second : '' };
  }
  return { obj: {}, msg: typeof first === 'string' ? first : '' };
};


const createFallbackLogger = () => ({
  trace: (...args) => console.debug(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  fatal: (...args) => console.error(...args),
  child: () => createFallbackLogger(),
});

// Bảng mã level mặc định của Pino (Dozzle tự nhận diện JSON và tô màu theo level):
// 10 = trace | 20 = debug | 30 = info | 40 = warn | 50 = error | 60 = fatal
let loggerInstance;
try {
  loggerInstance = pino({
    level: process.env.LOG_LEVEL || (config.app.env === 'production' ? 'info' : 'debug'),
    base: {
      service: 'soar-backend',
      env: config.app.env,
    },
    timestamp: formatVnTimestamp,
    hooks: {
      // Tự động bắn cảnh báo Telegram khi phát sinh lỗi thật (50 = error, 60 = fatal)
      logMethod(inputArgs, method, level) {
        if (level >= 50) {
          try {
            const { obj, msg } = parsePinoArgs(inputArgs);
            notifyTelegramOnError({ level, msg, obj });
          } catch (hookErr) {
            // Báo lỗi trực tiếp ra console.error của hệ thống, không gọi lại logger/Dozzle
            console.error('[Logger Hook Error]:', hookErr?.message || hookErr);
          }
        }
        return method.apply(this, inputArgs);
      },
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-webhook-secret"]',
        'res.headers["set-cookie"]',
        '*.password',
        '*.newPassword',
        '*.accesstoken',
        '*.refreshtoken',
      ],
      censor: '[REDACTED]',
    },
  });
} catch (setupErr) {
  console.error('[Logger Setup Error]: Khởi tạo Pino thất bại, chuyển sang console fallback:', setupErr?.message || setupErr);
  loggerInstance = createFallbackLogger();
}

export const logger = loggerInstance;

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers['x-request-id'];
    const id = existingId || uuidv4();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Quy đổi HTTP status -> level log: >=500/err -> error (50), >=400 -> warn (40), còn lại -> info (30)
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessObject: (req, _res, val) => attachUserContext(req, val),
  customErrorObject: (req, _res, _err, val) => attachUserContext(req, val),
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url.startsWith('/api/v1/playbooks/n8n-icon'),
  },
});
