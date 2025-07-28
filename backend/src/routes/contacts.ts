import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get contacts - to be implemented' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create contact - to be implemented' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get contact by ID - to be implemented' });
});

router.put('/:id', (req, res) => {
  res.json({ success: true, message: 'Update contact - to be implemented' });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete contact - to be implemented' });
});

export default router; 