import express from 'express';
import { generateAlerts, getAlerts, getAlertById, generateCustomAlert, getRecentNewAlertsCount, getCronJobStatus, toggleCronJob } from '../controllers/alertController.js';
import { handleWebhook } from '../controllers/webhookController.js';
import { register, login, forgotPassword, resetPassword, logout } from '../controllers/authController.js';
import { getExecutionLogs } from '../controllers/logController.js';
import { authWebhook } from '../middlewares/authWebhook.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';
import { getTemplateByType } from '../controllers/templateController.js';
import { triggerPlaybook } from '../controllers/playbookController.js';
import { refreshToken } from '../controllers/authController.js';

const router = express.Router();

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);


// Cron Routes
router.get('/cron/status', verifyToken, getCronJobStatus);
router.post('/cron/toggle', verifyToken, checkRole(['Admin']), toggleCronJob);

// Alert Routes
router.get('/alerts', verifyToken, getAlerts);
router.get('/alerts/stats/recent-new', verifyToken, getRecentNewAlertsCount);
router.get('/alerts/:id', verifyToken, getAlertById);
router.post('/alerts/generate', verifyToken, checkRole(['Admin']), generateAlerts);
router.post('/alerts/generate-custom', verifyToken, checkRole(['Admin']), generateCustomAlert);

// Logs Routes
router.get('/logs', verifyToken, getExecutionLogs);

// Template Routes
router.get('/templates/:type', getTemplateByType);

// Webhook Route
router.post('/webhook', authWebhook, handleWebhook);

// Playbook Trigger Route
router.post('/playbooks/trigger', verifyToken, checkRole(['Admin']), triggerPlaybook);

export default router;
