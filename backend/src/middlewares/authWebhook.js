import { config } from "../config/env.js";


export const authWebhook = (req, res, next) => {
  const secretHeader = req.headers['x-webhook-secret'];
  const expectedSecret = config.n8n.webhookSecret;

  if (!secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Header X-Webhook-Secret không hợp lệ'
    });
  }
  next();
};
  