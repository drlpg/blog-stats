import { supabase } from './lib/supabase.js';
import { setCORSHeaders, errorResponse, successResponse } from './lib/utils.js';

export default async function handler(req, res) {
  // 设置 CORS
  setCORSHeaders(res, req.headers.origin);
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return errorResponse(res, 'Method not allowed', 405);
  }
  
  try {
    const { type = 'summary', path, days = 30 } = req.query;
    
    switch (type) {
      case 'summary':
        return await getSummaryStats(res);
      
      case 'daily':
        return await getDailyStats(res, parseInt(days));
      
      case 'page':
        return await getPageStats(res, path);
      
      case 'recent':
        return await getRecentVisits(res, parseInt(days));
      
      default:
        return errorResponse(res, 'Invalid stats type');
    }
    
  } catch (error) {
    console.error('Stats API error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
}

// 获取总体统计
async function getSummaryStats(res) {
  try {
    // 直接查询基础表，避免视图权限问题
    const { data: visits, error } = await supabase
      .from('visits')
      .select('id, ip_hash, created_at');
    
    if (error) {
      console.error('Summary stats error:', error);
      return errorResponse(res, 'Failed to fetch summary stats', 500);
    }
    
    // 手动计算统计数据
    const totalPv = visits.length;
    const uniqueIps = new Set(visits.map(v => v.ip_hash));
    const totalUv = uniqueIps.size;
    const uniqueDates = new Set(visits.map(v => v.created_at.split('T')[0]));
    const activeDays = uniqueDates.size;
    
    const stats = {
      total_pv: totalPv,
      total_uv: totalUv,
      active_days: activeDays
    };
    
    return successResponse(res, stats);
  } catch (error) {
    console.error('Summary stats error:', error);
    return errorResponse(res, 'Failed to fetch summary stats', 500);
  }
}

// 获取每日统计
async function getDailyStats(res, days) {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .limit(days);
  
  if (error) {
    console.error('Daily stats error:', error);
    return errorResponse(res, 'Failed to fetch daily stats', 500);
  }
  
  return successResponse(res, data);
}

// 获取页面统计
async function getPageStats(res, specificPath) {
  let query = supabase.from('page_stats').select('*');
  
  if (specificPath) {
    query = query.eq('path', specificPath);
  } else {
    query = query.limit(50); // 限制返回前50个页面
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Page stats error:', error);
    return errorResponse(res, 'Failed to fetch page stats', 500);
  }
  
  return successResponse(res, specificPath ? data[0] : data);
}

// 获取最近访问记录
async function getRecentVisits(res, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('visits')
    .select('path, country, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Recent visits error:', error);
    return errorResponse(res, 'Failed to fetch recent visits', 500);
  }
  
  return successResponse(res, data);
}