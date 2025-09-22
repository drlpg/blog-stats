import { supabase } from './lib/supabase.js';
import { 
  hashIP, 
  getClientIP, 
  getCountry, 
  setCORSHeaders, 
  validatePath, 
  errorResponse, 
  successResponse 
} from './lib/utils.js';

export default async function handler(req, res) {
  // 设置 CORS
  setCORSHeaders(res, req.headers.origin);
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405);
  }
  
  try {
    const { path, referrer } = req.body;
    
    // 验证必需参数
    if (!path) {
      return errorResponse(res, 'Path is required');
    }
    
    // 验证路径格式
    if (!validatePath(path)) {
      return errorResponse(res, 'Invalid path format');
    }
    
    // 获取客户端信息
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const country = getCountry(req);
    const ipHash = hashIP(ip, userAgent);
    
    // 检查是否为重复访问（同一IP在5分钟内访问同一页面）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentVisit } = await supabase
      .from('visits')
      .select('id')
      .eq('path', path)
      .eq('ip_hash', ipHash)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);
    
    // 如果5分钟内有相同访问，不重复记录
    if (recentVisit && recentVisit.length > 0) {
      return successResponse(res, null, 'Visit already recorded recently');
    }
    
    // 插入访问记录
    const { data, error } = await supabase
      .from('visits')
      .insert([
        {
          path,
          ip_hash: ipHash,
          user_agent: userAgent,
          referrer: referrer || null,
          country
        }
      ])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return errorResponse(res, 'Failed to record visit', 500);
    }
    
    return successResponse(res, { id: data[0].id }, 'Visit recorded successfully');
    
  } catch (error) {
    console.error('API error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
}