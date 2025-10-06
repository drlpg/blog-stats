import { supabase } from './lib/supabase.js';
import { setCORSHeaders, errorResponse, successResponse } from './lib/utils.js';

// 缓存配置
const CACHE_TTL = 60 * 1000; // 1分钟缓存
const cache = new Map();

// 通用分页获取函数
async function fetchAllRecords(tableName, selectFields, filters = {}) {
  let allRecords = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select(selectFields)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    // 应用过滤条件
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'eq') {
        Object.entries(value).forEach(([field, val]) => {
          query = query.eq(field, val);
        });
      }
    });
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Fetch error for ${tableName}:`, error);
      break;
    }
    
    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  return allRecords;
}

// 缓存辅助函数
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  
  // 清理过期缓存
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        cache.delete(k);
      }
    }
  }
}

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
    // 检查缓存
    const cacheKey = 'summary_stats';
    const cached = getCachedData(cacheKey);
    if (cached) {
      return successResponse(res, cached);
    }
    
    // 并行获取PV和数据
    const [pvResult, allVisits] = await Promise.all([
      supabase.from('visits').select('*', { count: 'exact', head: true }),
      fetchAllRecords('visits', 'ip_hash, created_at')
    ]);
    
    if (pvResult.error) {
      console.error('PV count error:', pvResult.error);
      return errorResponse(res, 'Failed to fetch PV stats', 500);
    }
    
    // 使用 Set 高效计算唯一值
    const uniqueIps = new Set();
    const uniqueDates = new Set();
    
    allVisits.forEach(visit => {
      uniqueIps.add(visit.ip_hash);
      uniqueDates.add(visit.created_at.split('T')[0]);
    });
    
    const stats = {
      total_pv: pvResult.count || 0,
      total_uv: uniqueIps.size,
      active_days: uniqueDates.size
    };
    
    // 缓存结果
    setCachedData(cacheKey, stats);
    
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
  try {
    if (specificPath) {
      // 特定页面统计
      const cacheKey = `page_stats_${specificPath}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        return successResponse(res, cached);
      }
      
      // 并行获取PV和IP数据
      const [pvResult, allIps] = await Promise.all([
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('path', specificPath),
        fetchAllRecords('visits', 'ip_hash', { eq: { path: specificPath } })
      ]);
      
      if (pvResult.error) {
        console.error('Page PV count error:', pvResult.error);
        return errorResponse(res, 'Failed to fetch page PV', 500);
      }
      
      const pageStats = {
        path: specificPath,
        page_pv: pvResult.count || 0,
        page_uv: new Set(allIps.map(v => v.ip_hash)).size
      };
      
      setCachedData(cacheKey, pageStats);
      return successResponse(res, pageStats);
      
    } else {
      // 所有页面统计
      const cacheKey = 'all_page_stats';
      const cached = getCachedData(cacheKey);
      if (cached) {
        return successResponse(res, cached);
      }
      
      const allVisits = await fetchAllRecords('visits', 'path, ip_hash');
      
      if (allVisits.length === 0) {
        return successResponse(res, []);
      }
      
      // 使用 Map 优化分组统计
      const pageStatsMap = new Map();
      
      allVisits.forEach(visit => {
        if (!pageStatsMap.has(visit.path)) {
          pageStatsMap.set(visit.path, {
            path: visit.path,
            page_pv: 0,
            unique_ips: new Set()
          });
        }
        const stats = pageStatsMap.get(visit.path);
        stats.page_pv++;
        stats.unique_ips.add(visit.ip_hash);
      });
      
      // 转换为数组并排序
      const pageStats = Array.from(pageStatsMap.values())
        .map(stats => ({
          path: stats.path,
          page_pv: stats.page_pv,
          page_uv: stats.unique_ips.size
        }))
        .sort((a, b) => b.page_pv - a.page_pv)
        .slice(0, 50);
      
      setCachedData(cacheKey, pageStats);
      return successResponse(res, pageStats);
    }
  } catch (error) {
    console.error('Page stats error:', error);
    return errorResponse(res, 'Failed to fetch page stats', 500);
  }
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