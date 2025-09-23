/**
 * 博客统计客户端 - 修复版
 */

(function() {
  'use strict';
  
  const API_BASE = 'https://stats.lpblog.dpdns.org';
  let visitRecorded = false;
  
  console.log('📊 博客统计脚本已加载');
  
  // 记录访问
  async function recordVisit() {
    if (visitRecorded) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: window.location.pathname,
          referrer: document.referrer
        })
      });
      
      if (response.ok) {
        visitRecorded = true;
        console.log('Visit recorded successfully');
      }
    } catch (error) {
      console.error('Failed to record visit:', error);
    }
  }
  
  // 获取统计数据
  async function fetchStats() {
    try {
      console.log('🔍 开始获取统计数据...');
      
      // 获取总体统计
      const summaryResponse = await fetch(`${API_BASE}/api/stats?type=summary`);
      const summaryResult = await summaryResponse.json();
      
      // 获取当前页面统计
      const pageResponse = await fetch(`${API_BASE}/api/stats?type=page&path=${encodeURIComponent(window.location.pathname)}`);
      const pageResult = await pageResponse.json();
      
      console.log('📊 API响应:', { summaryResult, pageResult });
      
      if (summaryResult.success && summaryResult.data) {
        updateSiteStats(summaryResult.data);
        console.log('✅ 站点统计更新完成');
      }
      
      if (pageResult.success && pageResult.data) {
        updatePageStats(pageResult.data);
        console.log('✅ 页面统计更新完成');
      }
      
    } catch (error) {
      console.error('❌ 统计数据获取失败:', error);
      showFallbackStats();
    }
  }
  
  // 显示备用统计数据
  function showFallbackStats() {
    console.log('📊 显示备用统计数据');
    updateSiteStats({ total_pv: '---', total_uv: '---' });
    updatePageStats({ page_pv: '---' });
  }
  }
  
  // 更新站点统计
  function updateSiteStats(data) {
    console.log('🔄 更新站点统计:', data);
    
    // 站点总访问量
    const sitePvUpdated = updateElements([
      '#busuanzi_value_site_pv',
      '.site-pv',
      '[data-busuanzi-value="site_pv"]',
      'span[id*="site_pv"]'
    ], data.total_pv || 0);
    
    // 站点独立访客
    const siteUvUpdated = updateElements([
      '#busuanzi_value_site_uv', 
      '.site-uv',
      '[data-busuanzi-value="site_uv"]',
      'span[id*="site_uv"]'
    ], data.total_uv || 0);
    
    console.log(`📊 站点统计更新: PV(${sitePvUpdated}个), UV(${siteUvUpdated}个)`);
    
    // 显示统计容器
    showElements([
      '#busuanzi_container_site_pv',
      '#busuanzi_container_site_uv',
      '.busuanzi_container_site_pv',
      '.busuanzi_container_site_uv'
    ]);
  }
  
  // 更新页面统计
  function updatePageStats(data) {
    console.log('🔄 更新页面统计:', data);
    
    // 页面访问量
    const pagePvUpdated = updateElements([
      '#busuanzi_value_page_pv',
      '.page-pv',
      '[data-busuanzi-value="page_pv"]',
      'span[id*="page_pv"]'
    ], data.page_pv || 0);
    
    console.log(`📊 页面统计更新: PV(${pagePvUpdated}个)`);
    
    // 显示页面统计容器
    showElements([
      '#busuanzi_container_page_pv',
      '.busuanzi_container_page_pv'
    ]);
  }
  
  // 更新元素内容
  function updateElements(selectors, value) {
    let updateCount = 0;
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el) {
          el.textContent = value;
          updateCount++;
          console.log(`✅ 更新元素: ${selector} -> ${value}`);
        }
      });
    });
    return updateCount;
  }
  
  // 显示元素
  function showElements(selectors) {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el) {
          el.style.display = '';
          el.style.visibility = 'visible';
        }
      });
    });
  }
  
  // 初始化函数
  function init() {
    console.log('🚀 博客统计初始化开始...');
    
    // 记录访问
    recordVisit();
    
    // 延迟获取统计数据，确保页面元素已加载
    setTimeout(() => {
      fetchStats();
    }, 1500);
    
    statsLoaded = true;
    console.log('✅ 博客统计初始化完成');
  }
  
  // 等待页面加载完成
  function waitForLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // 页面已加载，延迟一点时间确保所有元素都渲染完成
      setTimeout(init, 500);
    }
  }
  
  // 兼容原版busuanzi的全局变量和方法
  window.busuanzi = {
    fetch: fetchStats,
    record: recordVisit,
    loaded: () => statsLoaded
  };
  
  // 为测试页面提供BlogStats类
  window.BlogStats = function(apiUrl) {
    this.apiBaseUrl = apiUrl || API_BASE;
    this.recordVisit = recordVisit;
    
    // 获取总体统计
    this.getSummary = async () => {
      const response = await fetch(`${this.apiBaseUrl}/api/stats?type=summary`);
      const result = await response.json();
      return result.success ? result.data : null;
    };
    
    // 获取每日统计
    this.getDailyStats = async (days = 30) => {
      const response = await fetch(`${this.apiBaseUrl}/api/stats?type=daily&days=${days}`);
      const result = await response.json();
      return result.success ? result.data : null;
    };
    
    // 获取页面统计
    this.getPageStats = async (path = null) => {
      let url = `${this.apiBaseUrl}/api/stats?type=page`;
      if (path) {
        url += `&path=${encodeURIComponent(path)}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      return result.success ? result.data : null;
    };
    
    // 获取最近访问
    this.getRecentVisits = async (days = 7) => {
      const response = await fetch(`${this.apiBaseUrl}/api/stats?type=recent&days=${days}`);
      const result = await response.json();
      return result.success ? result.data : null;
    };
    
    console.log('📦 BlogStats 类已创建（包含所有方法）');
  };
  
  // 启动初始化
  waitForLoad();
  
  console.log('📊 博客统计脚本已加载');
  
})();