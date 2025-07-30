import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

// Rate limiter geral
export const rateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter mais permissivo para mensagens (para evitar problemas com polling)
export const messageRateLimiter = rateLimit({
  windowMs: 60000, // 1 minuto
  max: 30, // 30 requisições por minuto
  message: {
    success: false,
    error: {
      message: 'Too many message requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para WebSocket upgrades
    return req.headers.upgrade === 'websocket';
  }
});

// Rate limiter para chats (mais permissivo)
export const chatRateLimiter = rateLimit({
  windowMs: 60000, // 1 minuto
  max: 20, // 20 requisições por minuto
  message: {
    success: false,
    error: {
      message: 'Too many chat requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
}); 