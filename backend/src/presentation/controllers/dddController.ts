import { Request, Response } from 'express';
import { DDD } from '../../core/entities';
import sequelize from '../../core/entities';
import { Op } from 'sequelize';

export const getDDDs = async (req: Request, res: Response) => {
  try {
    const { region, state, search } = req.query;

    let whereClause: any = { isActive: true };

    if (region) {
      whereClause.region = region;
    }

    if (state) {
      whereClause.state = state;
    }

    if (search) {
      whereClause[Op.or] = [
        { ddd: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } },
        { region: { [Op.like]: `%${search}%` } }
      ];
    }

    const ddds = await DDD.findAll({
      where: whereClause,
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description'],
      order: [['ddd', 'ASC']]
    });

    return res.json({
      success: true,
      data: ddds,
      count: ddds.length
    });
  } catch (error) {
    console.error('Error in getDDDs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getDDDById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ddd = await DDD.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description']      
    });

    if (!ddd) {
      return res.status(404).json({
        success: false,
        message: 'DDD não encontrado'
      });
    }

    return res.json({
      success: true,
      data: ddd
    });
  } catch (error) {
    console.error('Error in getDDDById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getDDDByCode = async (req: Request, res: Response) => {
  try {
    const { ddd } = req.params;

    const dddData = await DDD.findOne({
      where: {
        ddd: ddd,
        isActive: true
      },
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description']      
    });

    if (!dddData) {
      return res.status(404).json({
        success: false,
        message: 'DDD não encontrado'
      });
    }

    return res.json({
      success: true,
      data: dddData
    });
  } catch (error) {
    console.error('Error in getDDDByCode:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getDDDsByRegion = async (req: Request, res: Response) => {
  try {
    const { region } = req.params;

    const ddds = await DDD.findAll({
      where: { 
        region: region,
        isActive: true 
      },
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description'],
      order: [['ddd', 'ASC']]
    });

    if (ddds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum DDD encontrado para esta região'
      });
    }

    return res.json({
      success: true,
      data: ddds,
      count: ddds.length
    });
  } catch (error) {
    console.error('Error in getDDDsByRegion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getDDDsByState = async (req: Request, res: Response) => {
  try {
    const { state } = req.params;

    const ddds = await DDD.findAll({
      where: { 
        state: state,
        isActive: true 
      },
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description'],
      order: [['ddd', 'ASC']]
    });

    if (ddds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum DDD encontrado para este estado'
      });
    }

    return res.json({
      success: true,
      data: ddds,
      count: ddds.length
    });
  } catch (error) {
    console.error('Error in getDDDsByState:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getRegions = async (req: Request, res: Response) => {
  try {
    const regions = await DDD.findAll({
      where: { isActive: true },
      attributes: [
        'region',
        'regionCode',
        [sequelize.fn('COUNT', sequelize.col('id')), 'dddCount']
      ],
      group: ['region', 'regionCode'],
      order: [['region', 'ASC']]
    });

    return res.json({
      success: true,
      data: regions,
      count: regions.length
    });
  } catch (error) {
    console.error('Error in getRegions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getStates = async (req: Request, res: Response) => {
  try {
    const { region } = req.query;

    let whereClause: any = { isActive: true };

    if (region) {
      whereClause.region = region;
    }

    const states = await DDD.findAll({
      where: whereClause,
      attributes: [
        'state',
        'stateCode',
        'region',
        'regionCode',
        [sequelize.fn('COUNT', sequelize.col('id')), 'dddCount']
      ],
      group: ['state', 'stateCode', 'region', 'regionCode'],
      order: [['state', 'ASC']]
    });

    return res.json({
      success: true,
      data: states,
      count: states.length
    });
  } catch (error) {
    console.error('Error in getStates:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const createDDD = async (req: Request, res: Response) => {
  try {
    const { ddd, state, stateCode, region, regionCode, cities, description } = req.body;

    // Validate required fields
    if (!ddd || !state || !stateCode || !region || !regionCode) {
      return res.status(400).json({
        success: false,
        message: 'DDD, estado, código do estado, região e código da região são obrigatórios'
      });
    }

    // Check if DDD already exists
    const existingDDD = await DDD.findOne({
      where: { ddd: ddd }
    });

    if (existingDDD) {
      return res.status(409).json({
        success: false,
        message: 'DDD já existe'
      });
    }

    const newDDD = await DDD.create({
      ddd,
      state,
      stateCode,
      region,
      regionCode,
      cities: cities || [],
      description: description || '',
      isActive: true
    });

    return res.status(201).json({
      success: true,
      data: newDDD,
      message: 'DDD criado com sucesso'
    });
  } catch (error) {
    console.error('Error in createDDD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const updateDDD = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ddd, state, stateCode, region, regionCode, cities, description, isActive } = req.body;

    const dddToUpdate = await DDD.findByPk(id);

    if (!dddToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'DDD não encontrado'
      });
    }

    // Check if DDD code is being changed and if it already exists
    if (ddd && ddd !== dddToUpdate.ddd) {
      const existingDDD = await DDD.findOne({
        where: { ddd: ddd }
      });

      if (existingDDD) {
        return res.status(409).json({
          success: false,
          message: 'DDD já existe'
        });
      }
    }

    await dddToUpdate.update({
      ddd: ddd || dddToUpdate.ddd,
      state: state || dddToUpdate.state,
      stateCode: stateCode || dddToUpdate.stateCode,
      region: region || dddToUpdate.region,
      regionCode: regionCode || dddToUpdate.regionCode,
      cities: cities || dddToUpdate.cities,
      description: description !== undefined ? description : dddToUpdate.description,
      isActive: isActive !== undefined ? isActive : dddToUpdate.isActive
    });

    return res.json({
      success: true,
      data: dddToUpdate,
      message: 'DDD atualizado com sucesso'
    });
  } catch (error) {
    console.error('Error in updateDDD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const deleteDDD = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ddd = await DDD.findByPk(id);

    if (!ddd) {
      return res.status(404).json({
        success: false,
        message: 'DDD não encontrado'
      });
    }

    await ddd.destroy();

    return res.json({
      success: true,
      message: 'DDD excluído com sucesso'
    });
  } catch (error) {
    console.error('Error in deleteDDD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const searchDDDs = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro de busca é obrigatório'
      });
    }

    const searchTerm = q.trim();

    const ddds = await DDD.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { ddd: { [Op.like]: `%${searchTerm}%` } },
          { state: { [Op.like]: `%${searchTerm}%` } },
          { region: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      attributes: ['id', 'ddd', 'state', 'stateCode', 'region', 'regionCode', 'cities', 'description'],
      order: [['ddd', 'ASC']],
      limit: 50
    });

    return res.json({
      success: true,
      data: ddds,
      count: ddds.length,
      searchTerm
    });
  } catch (error) {
    console.error('Error in searchDDDs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getDDDStats = async (req: Request, res: Response) => {
  try {
    const totalDDDs = await DDD.count({ where: { isActive: true } });

    const regions = await DDD.findAll({
      where: { isActive: true },
      attributes: [
        'region',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['region'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    const states = await DDD.findAll({
      where: { isActive: true },
      attributes: [
        'state',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['state'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        total: totalDDDs,
        regions: regions,
        states: states
      }
    });
  } catch (error) {
    console.error('Error in getDDDStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 