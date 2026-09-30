export const authWebhook = (req, res, next) => {
  const secretHeader = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.WEBHOOK_SECRET || 'mock_soar_secret_123';

  if (!secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Header X-Webhook-Secret không hợp lệ'
    });
  }
  next();
};
  