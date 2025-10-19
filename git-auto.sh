#!/bin/bash
# Stats API 自动提交脚本 (本地优先)
# 用法: ./git-auto.sh "提交信息"

set -e  # 出错立即退出
START_TIME=$(date +%s)

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 切换到项目根目录
cd "$SCRIPT_DIR"

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

function step() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')] ➜ $1${NC}"
}

function success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

function error() {
    echo -e "${RED}❌ $1${NC}"
}

function info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# 标题
echo -e "${BLUE}📊 Stats API 自动提交工具 (本地优先)${NC}"
echo "=================================="
info "工作目录: $SCRIPT_DIR"

# 检查 Git 仓库
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    error "当前目录不是 Git 仓库"
    exit 1
fi

# 检查是否在正确的仓库
REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
if [[ ! "$REPO_URL" =~ "blog-stats" ]] && [[ ! "$REPO_URL" =~ "stats-api" ]]; then
    error "警告：当前仓库似乎不是 stats-api 项目"
    error "仓库地址: $REPO_URL"
    read -p "是否继续？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查提交信息
if [ -z "$1" ]; then
    error "请输入提交信息"
    echo "用法: ./git-auto.sh \"提交信息\""
    exit 1
fi

# 检查是否有提交历史
if git rev-parse --verify HEAD >/dev/null 2>&1; then
    # 有提交历史
    branch=$(git rev-parse --abbrev-ref HEAD)
    info "当前分支: $branch"
    
    # 拉取远程更新（本地优先）
    step "同步远程分支（本地优先策略）..."
    git fetch origin "$branch" 2>/dev/null || warning "无法连接远程仓库，跳过同步"
    if git rev-parse "origin/$branch" >/dev/null 2>&1; then
        if ! git merge -s ours --no-edit "origin/$branch"; then
            warning "合并冲突，已自动使用本地版本覆盖远程"
        fi
        success "远程更新已处理（本地优先）"
    else
        warning "远程分支不存在，跳过同步"
    fi
else
    # 新仓库，没有提交历史
    branch="main"
    info "新仓库，默认分支: $branch"
fi

# 检查状态
step "检查文件状态..."
git status --porcelain

# 自动添加变更
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    step "检测到未跟踪文件，自动添加..."
    git add -A
else
    git add -u
fi

# 提交
if git diff --cached --quiet; then
    warning "没有可提交的更改"
else
    step "准备提交..."
    git commit -m "$1"
    success "提交完成"

    step "推送到远程 (origin/$branch)..."
    if git push -u origin "$branch" 2>/dev/null; then
        success "推送完成"
    elif git push -f origin "$branch" 2>/dev/null; then
        success "强制推送完成"
    else
        error "推送失败，请检查网络连接"
        exit 1
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
success "Stats API 提交完成 🚀 (耗时 ${DURATION} 秒)"

echo ""
echo -e "${CYAN}📡 部署信息:${NC}"
echo "  • Vercel 自动检测更新并重新部署"
echo "  • API 地址: https://stats.lpblog.dpdns.org"
echo "  • 测试页面: https://stats.lpblog.dpdns.org/test.html"
echo ""
echo -e "${GREEN}🎉 全部完成！（本地版本已优先保留）${NC}"