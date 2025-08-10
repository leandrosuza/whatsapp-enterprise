import express from 'express';
import {
  getDDDs,
  getDDDById,
  getDDDByCode,
  getRegions,
  getStates,

  searchDDDs,
  getDDDStats
} from '../controllers/dddController';

const router = express.Router();

// Route to search all DDDs with optional filters
router.get('/', getDDDs);

// Route to search DDD by ID
router.get('/id/:id', getDDDById);

// Route to search DDD by code
router.get('/code/:ddd', getDDDByCode);

// Route to search all regions
router.get('/regions', getRegions);

// Route to search states (with optional region filter)
router.get('/states', getStates);

// Route to search cities (with optional state or DDD filters)


// Route for text search
router.get('/search', searchDDDs);

// Route for DDD statistics
router.get('/stats', getDDDStats);

export default router; 