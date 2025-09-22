/**
 * Busuanzi 兼容脚本
 * 替代原版不蒜子统计，使用自定义API
 */

(function() {
  'use strict';
  
  const API_BASE = 'https://stats.lpblog.dpdns.org';
  let visitRecorded = false;
  
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
      // 获取总体统计
      const summaryResponse = await fetch(`${API_BASE}/api/stats?type=summary`);
      const summaryResult = await summaryResponse.json();
      
      // 获取当前页面统计
      const pageResponse = await fetch(`${API_BASE}/api/stats?type=page&path=${encodeURIComponent(window.location.pathname)}`);
      const pageResult = await pageResponse.json();
      
      if (summaryResult.success && summaryResult.data) {
        updateSiteStats(summaryResult.data);
      }
      
      if (pageResult.success && pageResult.data) {
        updatePageStats(pageResult.data);
      }
      
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }
  
  // 更新站点统计
  function updateSiteStats(data) {
    // 站点总访问量
    updateElements([
      '#busuanzi_value_site_pv',
      '.site-pv',
      '[data-busuanzi-value="site_pv"]'
    ], data.total_pv || 0);
    
    // 站点独立访客
    updateElements([
      '#busuanzi_value_site_uv', 
      '.site-uv',
      '[data-busuanzi-value="site_uv"]'
    ], data.total_uv || 0);
    
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
    // 页面访问量
    updateElements([
      '#busuanzi_value_page_pv',
      '.page-pv',
      '[data-busuanzi-value="page_pv"]'
    ], data.page_pv || 0);
    
    // 显示页面统计容器
    showElements([
      '#busuanzi_container_page_pv',
      '.busuanzi_container_page_pv'
    ]);
  }
  
  // 更新元素内容
  function updateElements(selectors, value) {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el) {
          el.textContent = value;
        }
      });
    });
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
  
  // 初始化
  function init() {
    // 记录访问
    recordVisit();
    
    // 延迟获取统计数据，确保页面元素已加载
    setTimeout(() => {
      fetchStats();
    }, 1000);
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 兼容原版busuanzi的全局变量
  window.busuanzi = {
    fetch: fetchStats,
    record: recordVisit
  };
  
})();