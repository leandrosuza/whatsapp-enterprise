import rateLimit from 'express-rate-limit';

// Rate limiter geral - DESABILITADO TEMPORARIAMENTE
export const rateLimiter = (req: any, res: any, next: any) => {
  // Skip rate limiting completely
  next();
};

// Rate limiter mais permissivo para mensagens (para evitar problemas com polling)
export const messageRateLimiter = (req: any, res: any, next: any) => {
  // Skip rate limiting completely
  next();
};

// Rate limiter para chats (mais permissivo)
export const chatRateLimiter = (req: any, res: any, next: any) => {
  // Skip rate limiting completely
  next();
};

// Rate limiter para sync (muito permissivo para testes)
export const syncRateLimiter = (req: any, res: any, next: any) => {
  // Skip rate limiting completely
  next();
}; 