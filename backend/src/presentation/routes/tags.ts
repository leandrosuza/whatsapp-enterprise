import express from 'express';
import {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagStats
} from '../controllers/tagController';

const router = express.Router();

// Get all tags for user
router.get('/', getTags);

// Get tag statistics
router.get('/stats', getTagStats);

// Get tag by ID
router.get('/:id', getTagById);

// Create new tag
router.post('/', createTag);

// Update tag
router.put('/:id', updateTag);

// Delete tag
router.delete('/:id', deleteTag);

export default router;
