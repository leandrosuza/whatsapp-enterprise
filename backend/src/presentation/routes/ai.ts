import { Router } from 'express';

const router = Router();

router.post('/generate-reply', (req, res) => {
  res.json({ success: true, message: 'Generate AI reply - to be implemented' });
});

router.post('/analyze-sentiment', (req, res) => {
  res.json({ success: true, message: 'Analyze sentiment - to be implemented' });
});

export default router; 