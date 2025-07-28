import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get campaigns - to be implemented' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create campaign - to be implemented' });
});

export default router; 