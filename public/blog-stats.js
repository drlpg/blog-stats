/**
 * 博客统计客户端
 */

(function () {
  "use strict";

  const API_BASE = "https://stats.lpblog.dpdns.org";
  let visitRecorded = false;
  let statsLoaded = false;
  
  // 防止重复初始化
  if (window.blogStatsInitialized) {
    return;
  }
  window.blogStatsInitialized = true;

  // 记录访问
  async function recordVisit() {
    if (visitRecorded) return;

    try {
      const response = await fetch(`${API_BASE}/api/visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: window.location.pathname,
          referrer: document.referrer,
        }),
      });

      if (response.ok) {
        visitRecorded = true;
      }
    } catch (error) {
      console.error("Failed to record visit:", error);
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
      console.error("统计数据获取失败:", error);
      showFallbackStats();
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
    updateElements(["#busuanzi_site_pv", "#busuanzi_value_site_pv"], data.total_pv || 0);
    
    // 站点独立访客
    updateElements(["#busuanzi_site_uv", "#busuanzi_value_site_uv"], data.total_uv || 0);

    // 显示统计容器
    showElements([
      "#busuanzi_container_site_pv",
      "#busuanzi_container_site_uv"
    ]);
  }

  // 更新页面统计
  function updatePageStats(data) {
    // 页面访问量
    updateElements(["#busuanzi_page_pv", "#busuanzi_value_page_pv"], data.page_pv || 0);

    // 显示页面统计容器
    showElements(["#busuanzi_container_page_pv"]);
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
    // 记录访问
    recordVisit();

    // 立即获取统计数据
    fetchStats();

    statsLoaded = true;
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

  // 兼容原版busuanzi的全局变量和方法
  window.busuanzi = {
    fetch: fetchStats,
    record: recordVisit,
    loaded: () => statsLoaded,
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

  // 启动初始化
  waitForLoad();
})();