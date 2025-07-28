import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get conversations - to be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get conversation by ID - to be implemented' });
});

router.post('/:id/messages', (req, res) => {
  res.json({ success: true, message: 'Send message to conversation - to be implemented' });
});

export default router; 