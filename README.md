# 博客统计 API - Vercel + Supabase

这是一个基于 Vercel 和 Supabase 的博客访问统计系统，提供访问记录和统计查询功能。

## 功能特性

- ✅ 访问记录（PV/UV 统计）
- ✅ IP 哈希保护用户隐私
- ✅ 防重复访问（5分钟内同一IP访问同一页面不重复计数）
- ✅ 多维度统计（总体、每日、页面、最近访问）
- ✅ CORS 跨域支持
- ✅ 边缘函数优化
- ✅ 前端 JavaScript 客户端

## 部署步骤

### 1. Supabase 配置

你已经完成了 Supabase 数据库的创建，确保以下信息已准备好：
- Supabase 项目 URL
- Supabase Anon Key

### 2. 部署到 Vercel

#### 方法一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 在 api 目录下登录 Vercel
cd api
vercel login

# 部署项目
vercel

# 设置环境变量
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add ALLOWED_ORIGINS
vercel env add API_SECRET

# 重新部署以应用环境变量
vercel --prod
```

#### 方法二：通过 Vercel 网站

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库 "blog-stats"
4. 设置根目录为 `api`
5. 添加环境变量：
   - `SUPABASE_URL`: 你的 Supabase 项目 URL
   - `SUPABASE_ANON_KEY`: 你的 Supabase Anon Key
   - `ALLOWED_ORIGINS`: 允许的域名，如 `https://yourdomain.com`
   - `API_SECRET`: 用于 IP 哈希的密钥（随机字符串）

### 3. 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
API_SECRET=your_random_secret_key
```

## API 接口

### 记录访问

```
POST /api/visit
Content-Type: application/json

{
  "path": "/posts/example",
  "referrer": "https://google.com"
}
```

### 获取统计

```
GET /api/stats?type=summary
GET /api/stats?type=daily&days=30
GET /api/stats?type=page&path=/posts/example
GET /api/stats?type=recent&days=7
```

## 前端集成

### 基础用法

```html
<!-- 引入客户端脚本 -->
<script src="https://your-vercel-app.vercel.app/client/blog-stats.js"></script>

<script>
// 初始化统计客户端
const blogStats = new BlogStats('https://your-vercel-app.vercel.app');

// 自动记录访问
blogStats.init();

// 显示统计信息
blogStats.displayStats('stats-container', 'summary');
</script>

<!-- 统计显示容器 -->
<div id="stats-container"></div>
```

### 高级用法

```javascript
// 手动记录访问
await blogStats.recordVisit('/custom-path');

// 获取各种统计数据
const summary = await blogStats.getSummary();
const dailyStats = await blogStats.getDailyStats(30);
const pageStats = await blogStats.getPageStats('/posts/example');
const recentVisits = await blogStats.getRecentVisits(7);

console.log('总访问量:', summary.total_pv);
console.log('独立访客:', summary.total_uv);
```

## 在 Hexo 博客中集成

### 1. 添加统计脚本

在你的 Hexo 主题中添加统计脚本，通常在 `themes/butterfly/layout/includes/footer.pug` 或类似文件中：

```javascript
script(src="https://your-vercel-app.vercel.app/client/blog-stats.js")
script.
  const blogStats = new BlogStats('https://your-vercel-app.vercel.app');
  blogStats.init();
```

### 2. 显示统计信息

在需要显示统计的地方添加：

```html
<div id="blog-stats">
  <div id="stats-summary"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const blogStats = new BlogStats('https://your-vercel-app.vercel.app');
  blogStats.displayStats('stats-summary', 'summary');
});
</script>
```

## 注意事项

1. **隐私保护**: IP 地址会被哈希处理，不会存储原始 IP
2. **防刷机制**: 5分钟内同一IP访问同一页面不会重复计数
3. **性能优化**: 使用了数据库索引和视图来提升查询性能
4. **CORS 配置**: 确保在环境变量中正确设置允许的域名

## 故障排除

### 常见问题

1. **CORS 错误**: 检查 `ALLOWED_ORIGINS` 环境变量是否包含你的域名
2. **数据库连接失败**: 验证 Supabase URL 和 Key 是否正确
3. **统计不更新**: 检查浏览器控制台是否有 JavaScript 错误

### 调试模式

在浏览器控制台中启用调试：

```javascript
// 查看访问记录结果
blogStats.recordVisit().then(console.log);

// 查看统计数据
blogStats.getSummary().then(console.log);
```

## 许可证

MIT License