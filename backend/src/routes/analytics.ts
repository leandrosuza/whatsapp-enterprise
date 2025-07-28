import { Router } from 'express';

const router = Router();

router.get('/overview', (req, res) => {
  res.json({ success: true, message: 'Get analytics overview - to be implemented' });
});

router.get('/conversations', (req, res) => {
  res.json({ success: true, message: 'Get conversation analytics - to be implemented' });
});

export default router; 