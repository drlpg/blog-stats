import crypto from 'crypto';

/**
 * 生成 IP 哈希值（保护用户隐私）
 */
export function hashIP(ip, userAgent = '') {
  const salt = process.env.API_SECRET || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(ip + userAgent + salt)
    .digest('hex');
}

/**
 * 获取客户端真实 IP
 */
export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.connection?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * 获取国家代码（从 Vercel 边缘函数）
 */
export function getCountry(req) {
  return req.headers['x-vercel-ip-country'] || 'Unknown';
}

/**
 * CORS 处理
 */
export function setCORSHeaders(res, origin = '*') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * 验证路径格式
 */
export function validatePath(path) {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // 限制路径长度
  if (path.length > 500) {
    return false;
  }
  
  // 基本的路径格式验证
  return /^\/[a-zA-Z0-9\-_\/]*$/.test(path);
}

/**
 * 错误响应
 */
export function errorResponse(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: message
  });
}

/**
 * 成功响应
 */
export function successResponse(res, data = null, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data
  });
}