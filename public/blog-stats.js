/**
 * 博客统计客户端 - 优化版本
 * 版本: 2.0.0
 * 更新时间: 2025-01-02
 */

(function () {
  "use strict";

  const API_BASE = "https://stats.lpblog.dpdns.org";
  let visitRecorded = false;
  let statsLoaded = false;
  
  // 性能监控
  const performance = {
    startTime: Date.now(),
    apiCalls: 0,
    errors: 0,
    retries: 0
  };
  
  // 调试模式
  const DEBUG = window.location.search.includes('debug=stats');

  // PJAX 兼容性处理
  if (window.blogStatsInstance) {
    // 如果已有实例，重新获取统计数据
    window.blogStatsInstance.fetchStats();
    return;
  }

  // 记录访问
  async function recordVisit() {
    if (visitRecorded) return;

    try {
      const response = await fetch(`${API_BASE}/api/visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          path: window.location.pathname,
          referrer: document.referrer,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }),
      });

      if (response.ok) {
        visitRecorded = true;
        performance.apiCalls++;
        
        if (DEBUG) {
          console.log('访问记录成功', {
            path: window.location.pathname,
            timestamp: Date.now()
          });
        }
        
        // 访问记录成功后，延迟获取统计数据确保服务器已处理
        setTimeout(() => {
          fetchStats();
        }, 500);
      }
    } catch (error) {
      performance.errors++;
      console.error("Failed to record visit:", error);
      
      if (DEBUG) {
        console.error('访问记录失败详情:', {
          error: error.message,
          path: window.location.pathname,
          timestamp: Date.now()
        });
      }
    }
  }

  // 获取统计数据
  async function fetchStats(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒延迟
    
    try {
      // 添加时间戳防止缓存
      const timestamp = Date.now();
      const cacheBreaker = `?t=${timestamp}&retry=${retryCount}`;
      
      // 获取总体统计
      const summaryResponse = await fetch(`${API_BASE}/api/stats?type=summary${cacheBreaker}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const summaryResult = await summaryResponse.json();

      // 获取当前页面统计
      const pageResponse = await fetch(
        `${API_BASE}/api/stats?type=page&path=${encodeURIComponent(
          window.location.pathname
        )}${cacheBreaker}`,
        {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      const pageResult = await pageResponse.json();

      performance.apiCalls += 2; // 两个API调用
      
      if (summaryResult.success && summaryResult.data) {
        updateSiteStats(summaryResult.data);
        
        if (DEBUG) {
          console.log('站点统计更新成功:', summaryResult.data);
        }
      }

      if (pageResult.success && pageResult.data) {
        updatePageStats(pageResult.data);
        
        if (DEBUG) {
          console.log('页面统计更新成功:', pageResult.data);
        }
        
        // 如果页面访问量为0且是新文章，尝试重试
        if (pageResult.data.page_pv === 0 && retryCount < maxRetries) {
          performance.retries++;
          
          if (DEBUG) {
            console.log(`页面访问量为0，准备重试 ${retryCount + 1}/${maxRetries}`);
          }
          
          setTimeout(() => {
            fetchStats(retryCount + 1);
          }, retryDelay * (retryCount + 1)); // 递增延迟
        }
      } else if (retryCount < maxRetries) {
        // 如果获取失败，进行重试
        performance.retries++;
        setTimeout(() => {
          fetchStats(retryCount + 1);
        }, retryDelay * (retryCount + 1));
      }
    } catch (error) {
      performance.errors++;
      console.error("统计数据获取失败:", error);
      
      if (DEBUG) {
        console.error('统计数据获取失败详情:', {
          error: error.message,
          retryCount,
          maxRetries,
          timestamp: Date.now()
        });
      }
      
      if (retryCount < maxRetries) {
        // 重试机制
        performance.retries++;
        setTimeout(() => {
          fetchStats(retryCount + 1);
        }, retryDelay * (retryCount + 1));
      } else {
        showFallbackStats();
      }
    }
  }

  // 显示备用统计数据
  function showFallbackStats() {
    updateSiteStats({ total_pv: "---", total_uv: "---" });
    updatePageStats({ page_pv: "---" });
  }

  // 更新站点统计
  function updateSiteStats(data) {
    // 站点总访问量
    updateElements(
      ["#busuanzi_site_pv", "#busuanzi_value_site_pv"],
      data.total_pv || 0
    );

    // 站点独立访客
    updateElements(
      ["#busuanzi_site_uv", "#busuanzi_value_site_uv"],
      data.total_uv || 0
    );

    // 显示统计容器
    showElements([
      "#busuanzi_container_site_pv",
      "#busuanzi_container_site_uv",
    ]);
  }

  // 更新页面统计
  function updatePageStats(data) {
    const pageViews = data.page_pv || 0;
    
    // 页面访问量
    updateElements(
      ["#busuanzi_page_pv", "#busuanzi_value_page_pv"],
      pageViews
    );

    // 显示页面统计容器
    showElements(["#busuanzi_container_page_pv"]);
    
    // 如果是新文章（访问量为0），显示友好提示
    if (pageViews === 0) {
      // 检测是否为新文章
      if (isNewArticle()) {
        updateElements(
          ["#busuanzi_page_pv", "#busuanzi_value_page_pv"],
          "1" // 至少显示当前访问
        );
      }
    }
  }
  
  // 检测是否为新文章
  function isNewArticle() {
    const NEW_ARTICLE_THRESHOLD = 24 * 60 * 60 * 1000; // 24小时
    
    // 方法1: 检查页面发布时间
    const publishTime = getPublishTime();
    if (publishTime) {
      const timeDiff = Date.now() - publishTime;
      return timeDiff < NEW_ARTICLE_THRESHOLD;
    }
    
    // 方法2: 检查URL是否包含最近日期
    const urlDate = extractDateFromUrl();
    if (urlDate) {
      const timeDiff = Date.now() - urlDate;
      return timeDiff < NEW_ARTICLE_THRESHOLD;
    }
    
    return false;
  }
  
  // 获取文章发布时间
  function getPublishTime() {
    const selectors = [
      'time[datetime]',
      '.post-meta time',
      '.post-date',
      '[data-published]',
      'meta[property="article:published_time"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        let timeStr = element.getAttribute('datetime') || 
                     element.getAttribute('data-published') || 
                     element.textContent;
        
        if (selector.includes('meta')) {
          timeStr = element.getAttribute('content');
        }
        
        const time = new Date(timeStr).getTime();
        if (!isNaN(time)) {
          return time;
        }
      }
    }
    
    return null;
  }
  
  // 从URL提取日期
  function extractDateFromUrl() {
    const path = window.location.pathname;
    const datePatterns = [
      /\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//,
      /\/(\d{4})-(\d{1,2})-(\d{1,2})\//,
      /\/(\d{4})(\d{2})(\d{2})\//
    ];
    
    for (const pattern of datePatterns) {
      const match = path.match(pattern);
      if (match) {
        const [, year, month, day] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.getTime();
      }
    }
    
    return null;
  }

  // 更新元素内容
  function updateElements(selectors, value) {
    const updatedElements = new Set(); // 防止重复更新同一元素

    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el && !updatedElements.has(el)) {
          el.textContent = value;
          updatedElements.add(el);
        }
      });
    });
  }

  // 显示元素
  function showElements(selectors) {
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el) {
          el.style.display = "";
          el.style.visibility = "visible";
        }
      });
    });
  }

  // 初始化函数
  function init() {
    // 先显示加载状态
    showLoadingState();
    
    // 记录访问
    recordVisit();

    // 延迟获取统计数据，给服务器处理时间
    setTimeout(() => {
      fetchStats();
    }, 300);

    statsLoaded = true;
  }
  
  // 显示加载状态
  function showLoadingState() {
    updateElements(
      ["#busuanzi_page_pv", "#busuanzi_value_page_pv"],
      "..."
    );
    updateElements(
      ["#busuanzi_site_pv", "#busuanzi_value_site_pv"],
      "..."
    );
    updateElements(
      ["#busuanzi_site_uv", "#busuanzi_value_site_uv"],
      "..."
    );
  }

  // 等待页面加载完成
  function waitForLoad() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      // 页面已加载，延迟一点时间确保所有元素都渲染完成
      setTimeout(init, 500);
    }
  }

  // PJAX 兼容性：监听 PJAX 页面切换事件
  document.addEventListener("pjax:complete", function () {
    // PJAX 切换完成后重新获取统计数据
    setTimeout(() => {
      visitRecorded = false; // 重置访问记录状态
      init();
    }, 100);
  });

  // 兼容其他可能的页面切换事件
  document.addEventListener("DOMContentLoaded", function () {
    if (!statsLoaded) {
      init();
    }
  });

  // 创建全局实例，支持 PJAX
  window.blogStatsInstance = {
    fetchStats: fetchStats,
    recordVisit: recordVisit,
    loaded: () => statsLoaded,
    refresh: () => {
      visitRecorded = false;
      init();
    },
    // 新增：手动设置统计值
    setStats: (siteUv, sitePv, pagePv) => {
      if (siteUv !== undefined) {
        updateElements(["#busuanzi_site_uv", "#busuanzi_value_site_uv"], siteUv);
      }
      if (sitePv !== undefined) {
        updateElements(["#busuanzi_site_pv", "#busuanzi_value_site_pv"], sitePv);
      }
      if (pagePv !== undefined) {
        updateElements(["#busuanzi_page_pv", "#busuanzi_value_page_pv"], pagePv);
      }
    }
  };

  // 兼容原版busuanzi的全局变量和方法
  window.busuanzi = {
    fetch: fetchStats,
    record: recordVisit,
    loaded: () => statsLoaded,
    refresh: window.blogStatsInstance.refresh,
    setStats: window.blogStatsInstance.setStats
  };

  // 为测试页面提供BlogStats类
  window.BlogStats = function (apiUrl) {
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
      const response = await fetch(
        `${this.apiBaseUrl}/api/stats?type=daily&days=${days}`
      );
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
      const response = await fetch(
        `${this.apiBaseUrl}/api/stats?type=recent&days=${days}`
      );
      const result = await response.json();
      return result.success ? result.data : null;
    };
  };

  // 性能报告
  function reportPerformance() {
    const totalTime = Date.now() - performance.startTime;
    
    if (DEBUG) {
      console.log('统计脚本性能报告:', {
        总耗时: `${totalTime}ms`,
        API调用次数: performance.apiCalls,
        错误次数: performance.errors,
        重试次数: performance.retries,
        统计加载状态: statsLoaded ? '成功' : '失败'
      });
    }
    
    // 如果有错误或性能问题，可以发送到监控服务
    if (performance.errors > 0 || totalTime > 10000) {
      // 这里可以添加错误报告逻辑
      console.warn('统计脚本存在性能问题或错误');
    }
  }
  
  // 页面卸载时报告性能
  window.addEventListener('beforeunload', reportPerformance);
  
  // 5秒后报告一次性能（用于调试）
  if (DEBUG) {
    setTimeout(reportPerformance, 5000);
  }

  // 启动初始化
  waitForLoad();
})();
