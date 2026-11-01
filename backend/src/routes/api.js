import express from 'express';
import { generateAlerts, getAlerts, getAlertById, generateCustomAlert, getRecentNewAlertsCount, getDashboardStats, getCronJobStatus, toggleCronJob, toggleSimulatorJob, toggleAutoTriage, updateAutoTriageSettings } from '../controllers/alertController.js';
import { handleWebhook } from '../controllers/webhookController.js';
import { register, login, forgotPassword, resetPassword, logout, getUsers, deleteUser, refreshToken } from '../controllers/authController.js';
import { getExecutionLogs } from '../controllers/logController.js';
import { authWebhook } from '../middlewares/authWebhook.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';
import { getTemplateByType } from '../controllers/templateController.js';
import { 
  triggerPlaybook, 
  getPlaybooks, 
  updatePlaybookLayout, 
  syncWorkflowFromN8n,
  getN8nNodeTypes,
  getN8nIconProxy,
  getN8nLiveWorkflow
} from '../controllers/playbookController.js';

const router = express.Router();

// Auth Routes
router.post('/auth/register', verifyToken, checkRole(['Admin']), register);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// User Management Routes (Chỉ Admin)
router.get('/users', verifyToken, checkRole(['Admin']), getUsers);
router.post('/users', verifyToken, checkRole(['Admin']), register);
router.delete('/users/:id', verifyToken, checkRole(['Admin']), deleteUser);

// Cron Routes
router.get('/cron/status', verifyToken, getCronJobStatus);
router.post('/cron/toggle', verifyToken, checkRole(['Admin']), toggleCronJob);

// Alert Routes
router.get('/alerts', verifyToken, getAlerts);
router.get('/alerts/stats/recent-new', verifyToken, getRecentNewAlertsCount);
router.get('/alerts/stats/dashboard', verifyToken, getDashboardStats);
router.get('/alerts/:id', verifyToken, getAlertById);
router.post('/alerts/generate', verifyToken, checkRole(['Admin']), generateAlerts);
router.post('/alerts/generate-custom', verifyToken, checkRole(['Admin']), generateCustomAlert);

// Logs Routes
router.get('/logs', verifyToken, getExecutionLogs);

// Template Routes
router.get('/templates/:type', getTemplateByType);

// Webhook Route
router.post('/webhook', authWebhook, handleWebhook);

// Playbook Routes
router.get('/playbooks', verifyToken, getPlaybooks);
router.get('/playbooks/n8n-workflow', verifyToken, getN8nLiveWorkflow); // Lấy workflow trực tiếp từ máy chủ n8n Web
router.get('/playbooks/n8n-node-types', verifyToken, getN8nNodeTypes);
router.get('/playbooks/n8n-icon', getN8nIconProxy); // Public endpoint để thẻ <img> tải SVG không bị chặn bởi Auth header
router.put('/playbooks/:id', verifyToken, checkRole(['Admin']), updatePlaybookLayout);
router.post('/playbooks/trigger', verifyToken, checkRole(['Admin']), triggerPlaybook);
router.post('/playbooks/sync-n8n', verifyToken, checkRole(['Admin']), syncWorkflowFromN8n);

router.post('/cron/toggle-simulator-job', verifyToken, checkRole(['Admin']), toggleSimulatorJob);
router.post('/cron/toggle-auto-triage', verifyToken, checkRole(['Admin']), toggleAutoTriage);
router.post('/cron/update-auto-triage-settings', verifyToken, checkRole(['Admin']), updateAutoTriageSettings);

export default router;
