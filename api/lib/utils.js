import { createHash } from 'crypto';

/**
 * 生成 IP 哈希值（保护用户隐私）
 */
export function hashIP(ip, userAgent = '') {
  const salt = process.env.API_SECRET || 'default-salt';
  return createHash('sha256')
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
 * CORS 处理（根据 ALLOWED_DOMAINS 环境变量限制来源）
 */
export function setCORSHeaders(res, origin = '') {
  const allowedDomainsEnv = process.env.ALLOWED_DOMAINS || '';
  let allowOrigin = '*';

  if (allowedDomainsEnv && origin) {
    const allowedList = allowedDomainsEnv.split(',').map(d => d.trim());
    const isMatched = allowedList.some(domain => origin.includes(domain));
    if (isMatched) {
      allowOrigin = origin;
    }
  }

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
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
  
  // 必须以/开头
  if (!path.startsWith('/')) {
    return false;
  }
  
  // 简化验证：只检查基本安全性，允许大部分URL字符
  // 禁止危险字符如 <, >, ", ', \, null字符等
  // eslint-disable-next-line no-control-regex
  return !/[<>"'\\\x00-\x1f\x7f]/.test(path);
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