import { Request, Response } from 'express';
import { Tag } from '../../core/entities';
import { Op } from 'sequelize';
import { sequelize } from '../../infrastructure/database/database';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

// Get all tags for a user
export const getTags = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1; // Fallback for testing
    const { search, active } = req.query;

    let whereClause: any = { userId };

    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const tags = await Tag.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'color', 'description', 'isActive', 'usageCount', 'createdAt'],
      order: [['name', 'ASC']]
    });

    return res.json({
      success: true,
      data: tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error in getTags:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get tag by ID
export const getTagById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Fallback for testing

    const tag = await Tag.findOne({
      where: { id, userId },
      attributes: ['id', 'name', 'color', 'description', 'isActive', 'usageCount', 'createdAt', 'updatedAt']
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag não encontrada'
      });
    }

    return res.json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Error in getTagById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Create new tag
export const createTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1; // Fallback for testing
    const { name, color, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nome da tag é obrigatório'
      });
    }

    // Check if tag already exists for this user
    const existingTag = await Tag.findOne({
      where: { userId, name: name.trim() }
    });

    if (existingTag) {
      return res.status(409).json({
        success: false,
        message: 'Uma tag com este nome já existe'
      });
    }

    const tag = await Tag.create({
      userId,
      name: name.trim(),
      color: color || '#3B82F6', // Default blue color
      description: description?.trim() || null,
      isActive: true,
      usageCount: 0
    });

    return res.status(201).json({
      success: true,
      message: 'Tag criada com sucesso',
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        isActive: tag.isActive,
        usageCount: tag.usageCount,
        createdAt: tag.createdAt
      }
    });
  } catch (error) {
    console.error('Error in createTag:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Update tag
export const updateTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Fallback for testing
    const { name, color, description, isActive } = req.body;

    const tag = await Tag.findOne({
      where: { id, userId }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag não encontrada'
      });
    }

    // Check if new name conflicts with existing tag
    if (name && name.trim() !== tag.name) {
      const existingTag = await Tag.findOne({
        where: { userId, name: name.trim(), id: { [Op.ne]: id } }
      });

      if (existingTag) {
        return res.status(409).json({
          success: false,
          message: 'Uma tag com este nome já existe'
        });
      }
    }

    // Update tag
    await tag.update({
      name: name?.trim() || tag.name,
      color: color || tag.color,
      description: description?.trim() || tag.description,
      isActive: isActive !== undefined ? isActive : tag.isActive
    });

    return res.json({
      success: true,
      message: 'Tag atualizada com sucesso',
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        isActive: tag.isActive,
        usageCount: tag.usageCount,
        updatedAt: tag.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in updateTag:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Delete tag
export const deleteTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Fallback for testing

    const tag = await Tag.findOne({
      where: { id, userId }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag não encontrada'
      });
    }

    // Check if tag is being used
    if (tag.usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir uma tag que está sendo utilizada'
      });
    }

    await tag.destroy();

    return res.json({
      success: true,
      message: 'Tag excluída com sucesso'
    });
  } catch (error) {
    console.error('Error in deleteTag:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Get tag statistics
export const getTagStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1; // Fallback for testing

    const stats = await Tag.findAll({
      where: { userId, isActive: true },
      attributes: [
        'id',
        'name',
        'usageCount',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTags']
      ],
      group: ['id', 'name', 'usageCount'],
      order: [['usageCount', 'DESC']]
    });

    const totalTags = await Tag.count({ where: { userId, isActive: true } });
    const totalUsage = await Tag.sum('usageCount', { where: { userId, isActive: true } });

    return res.json({
      success: true,
      data: {
        tags: stats,
        totalTags,
        totalUsage: totalUsage || 0
      }
    });
  } catch (error) {
    console.error('Error in getTagStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
