/**
 * 博客统计客户端 JavaScript
 * 用于在博客页面中记录访问和显示统计信息
 */

class BlogStats {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, ''); // 移除末尾斜杠
    this.visited = new Set(); // 防止重复记录
  }

  /**
   * 记录页面访问
   */
  async recordVisit(path = null, referrer = null) {
    try {
      // 使用当前路径或提供的路径
      const visitPath = path || window.location.pathname;
      
      // 防止重复记录同一页面
      if (this.visited.has(visitPath)) {
        return;
      }
      
      const response = await fetch(`${this.apiBaseUrl}/api/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: visitPath,
          referrer: referrer || document.referrer
        })
      });
      
      if (response.ok) {
        this.visited.add(visitPath);
        console.log('Visit recorded:', visitPath);
      }
    } catch (error) {
      console.error('Failed to record visit:', error);
    }
  }

  /**
   * 获取统计数据
   */
  async getStats(type = 'summary', options = {}) {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      
      // 添加额外参数
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined) {
          params.append(key, options[key]);
        }
      });
      
      const response = await fetch(`${this.apiBaseUrl}/api/stats?${params}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return null;
    }
  }

  /**
   * 获取总体统计
   */
  async getSummary() {
    return await this.getStats('summary');
  }

  /**
   * 获取每日统计
   */
  async getDailyStats(days = 30) {
    return await this.getStats('daily', { days });
  }

  /**
   * 获取页面统计
   */
  async getPageStats(path = null) {
    return await this.getStats('page', { path });
  }

  /**
   * 获取最近访问
   */
  async getRecentVisits(days = 7) {
    return await this.getStats('recent', { days });
  }

  /**
   * 显示统计信息到指定元素
   */
  async displayStats(elementId, type = 'summary') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    try {
      const stats = await this.getStats(type);
      if (!stats) {
        element.innerHTML = '<p>统计数据加载失败</p>';
        return;
      }

      let html = '';
      
      switch (type) {
        case 'summary':
          html = `
            <div class="blog-stats-summary">
              <div class="stat-item">
                <span class="stat-label">总访问量:</span>
                <span class="stat-value">${stats.total_pv || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">独立访客:</span>
                <span class="stat-value">${stats.total_uv || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">活跃天数:</span>
                <span class="stat-value">${stats.active_days || 0}</span>
              </div>
            </div>
          `;
          break;
          
        case 'page':
          if (Array.isArray(stats)) {
            html = '<div class="blog-stats-pages"><h4>热门页面</h4><ul>';
            stats.slice(0, 10).forEach(page => {
              html += `<li>${page.path} (${page.page_pv} 次访问)</li>`;
            });
            html += '</ul></div>';
          } else {
            html = `
              <div class="blog-stats-page">
                <p>当前页面访问量: ${stats.page_pv || 0}</p>
                <p>独立访客: ${stats.page_uv || 0}</p>
              </div>
            `;
          }
          break;
      }
      
      element.innerHTML = html;
    } catch (error) {
      console.error('Failed to display stats:', error);
      element.innerHTML = '<p>统计数据显示失败</p>';
    }
  }

  /**
   * 自动初始化（记录当前页面访问）
   */
  init() {
    // 页面加载完成后记录访问
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordVisit();
      });
    } else {
      this.recordVisit();
    }
  }
}

// 使用示例：
// const blogStats = new BlogStats('https://your-vercel-app.vercel.app');
// blogStats.init(); // 自动记录访问
// blogStats.displayStats('stats-container', 'summary'); // 显示统计

// 如果在浏览器环境中，将 BlogStats 添加到全局对象
if (typeof window !== 'undefined') {
  window.BlogStats = BlogStats;
}