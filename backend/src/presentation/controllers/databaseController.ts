import { Request, Response } from 'express';
import { sequelize } from '../../infrastructure/database/database';
import { User, Contact, WhatsAppProfile, DDD, Tag } from '../../core/entities';
import { QueryTypes } from 'sequelize';

// Get database overview
export const getDatabaseOverview = async (req: Request, res: Response) => {
  try {
    // Get table information
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      { type: QueryTypes.SELECT }
    );

    // Get row counts for each table
    const tableStats = await Promise.all(
      tables.map(async (table: any) => {
        const count = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${table.name}`,
          { type: QueryTypes.SELECT }
        );
        return {
          name: table.name,
          rowCount: (count[0] as any).count
        };
      })
    );

    // Get database size
    const dbSize = await sequelize.query(
      "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()",
      { type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      data: {
        tables: tableStats,
        databaseSize: (dbSize[0] as any)?.size || 0,
        totalTables: tables.length
      }
    });
  } catch (error) {
    console.error('Error in getDatabaseOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get table data with pagination
export const getTableData = async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Validate table name
    const validTables = ['users', 'contacts', 'whatsapp_profiles', 'tags', 'ddds'];
    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: 'Tabela inválida'
      });
    }

    // Build query
    let whereClause = '';
    let params: any[] = [];
    
    if (search) {
      // Get table columns to search in
      const columns = await sequelize.query(
        `PRAGMA table_info(${tableName})`,
        { type: QueryTypes.SELECT }
      );
      
      const searchableColumns = columns
        .filter((col: any) => col.type === 'TEXT' || col.type === 'VARCHAR')
        .map((col: any) => col.name);
      
      if (searchableColumns.length > 0) {
        const searchConditions = searchableColumns.map(col => `${col} LIKE ?`);
        whereClause = `WHERE ${searchConditions.join(' OR ')}`;
        params = Array(searchableColumns.length).fill(`%${search}%`);
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: params
    });
    const totalCount = (countResult[0] as any).count;

    // Get data with pagination
    const dataQuery = `SELECT * FROM ${tableName} ${whereClause} LIMIT ? OFFSET ?`;
    const data = await sequelize.query(dataQuery, {
      type: QueryTypes.SELECT,
      replacements: [...params, Number(limit), offset]
    });

    // Get table schema
    const schema = await sequelize.query(
      `PRAGMA table_info(${tableName})`,
      { type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      data: {
        tableName,
        schema,
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getTableData:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get table schema
export const getTableSchema = async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    
    const validTables = ['users', 'contacts', 'whatsapp_profiles', 'tags', 'ddds'];
    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        message: 'Tabela inválida'
      });
    }

    const schema = await sequelize.query(
      `PRAGMA table_info(${tableName})`,
      { type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      data: {
        tableName,
        schema
      }
    });
  } catch (error) {
    console.error('Error in getTableSchema:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Execute custom query
export const executeQuery = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query inválida'
      });
    }

    // Basic security check - only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select ')) {
      return res.status(400).json({
        success: false,
        message: 'Apenas queries SELECT são permitidas'
      });
    }

    const result = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    return res.json({
      success: true,
      data: {
        query,
        result,
        rowCount: result.length
      }
    });
  } catch (error) {
    console.error('Error in executeQuery:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na execução da query',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get database statistics
export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const stats = {
      users: await User.count(),
      contacts: await Contact.count(),
      whatsappProfiles: await WhatsAppProfile.count(),
      tags: await Tag.count(),
      ddds: await DDD.count()
    };

    // Get recent activity
    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'email', 'createdAt']
    });

    const recentContacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'phone', 'createdAt']
    });

    return res.json({
      success: true,
      data: {
        stats,
        recentActivity: {
          users: recentUsers,
          contacts: recentContacts
        }
      }
    });
  } catch (error) {
    console.error('Error in getDatabaseStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get all tables and their data
export const getAllTablesData = async (req: Request, res: Response) => {
  try {
    // Get all table names
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      { type: QueryTypes.SELECT }
    );

    const tablesData = await Promise.all(
      tables.map(async (table: any) => {
        try {
          // Get table schema
          const schema = await sequelize.query(
            `PRAGMA table_info(${table.name})`,
            { type: QueryTypes.SELECT }
          );

          // Get table data (limit to 1000 rows to avoid memory issues)
          const data = await sequelize.query(
            `SELECT * FROM ${table.name} LIMIT 1000`,
            { type: QueryTypes.SELECT }
          );

          // Get row count
          const countResult = await sequelize.query(
            `SELECT COUNT(*) as count FROM ${table.name}`,
            { type: QueryTypes.SELECT }
          );

          return {
            name: table.name,
            schema: schema,
            data: data,
            rowCount: (countResult[0] as any).count,
            hasMoreData: (countResult[0] as any).count > 1000
          };
        } catch (error) {
          console.error(`Error getting data for table ${table.name}:`, error);
          return {
            name: table.name,
            schema: [],
            data: [],
            rowCount: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          };
        }
      })
    );

    return res.json({
      success: true,
      data: {
        tables: tablesData,
        totalTables: tables.length
      }
    });
  } catch (error) {
    console.error('Error in getAllTablesData:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
