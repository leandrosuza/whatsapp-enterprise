import express from 'express';
import {
  getDatabaseOverview,
  getTableData,
  getTableSchema,
  executeQuery,
  getDatabaseStats,
  getAllTablesData
} from '../controllers/databaseController';

const router = express.Router();

// Get database overview
router.get('/overview', getDatabaseOverview);

// Get database statistics
router.get('/stats', getDatabaseStats);

// Get table data with pagination
router.get('/tables/:tableName', getTableData);

// Get table schema
router.get('/tables/:tableName/schema', getTableSchema);

// Execute custom query (SELECT only)
router.post('/query', executeQuery);

// Get all tables and their data
router.get('/all-tables', getAllTablesData);

export default router;
