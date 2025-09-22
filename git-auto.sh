#!/bin/bash
# Stats API 自动提交脚本
# 用法: ./git-auto.sh "提交信息"

set -e  # 出错立即退出
START_TIME=$(date +%s)

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

# 显示脚本标题
echo -e "${BLUE}📊 Stats API 自动提交工具${NC}"
echo "=================================="

# 检查是否在 Git 仓库中
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    error "当前目录不是 Git 仓库"
    exit 1
fi

# 检查提交信息
if [ -z "$1" ]; then
    error "请输入提交信息"
    echo "用法: ./git-auto.sh \"提交信息\""
    echo "示例: ./git-auto.sh \"更新 API 接口\""
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
info "当前分支: $branch"

# 拉取远程更新
step "检测远程更新..."
git fetch origin "$branch"

LOCAL=$(git rev-parse "$branch")
REMOTE=$(git rev-parse "origin/$branch")
BASE=$(git merge-base "$branch" "origin/$branch")

if [ "$LOCAL" != "$REMOTE" ] && [ "$LOCAL" = "$BASE" ]; then
    step "远程有更新，正在合并..."
    git merge --no-edit "origin/$branch" || {
        error "合并冲突，请手动解决："
        git status
        exit 1
    }
    success "远程更新已合并"
else
    success "远程已是最新"
fi

# 显示当前状态
step "检查文件状态..."
git status --porcelain

# 检测未跟踪文件并添加
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    step "检测到未跟踪文件，自动添加..."
    git add -A
    info "已添加所有新文件"
else
    step "没有新文件，检查已跟踪文件变更..."
    git add -u
fi

# 检查是否有改动
if git diff --cached --quiet; then
    warning "没有可提交的更改"
    info "所有文件都是最新的"
else
    step "准备提交更改..."
    
    # 显示将要提交的文件
    echo -e "${YELLOW}将要提交的文件:${NC}"
    git diff --cached --name-status | while read status file; do
        case $status in
            A) echo -e "  ${GREEN}+ $file${NC} (新增)" ;;
            M) echo -e "  ${YELLOW}~ $file${NC} (修改)" ;;
            D) echo -e "  ${RED}- $file${NC} (删除)" ;;
            *) echo -e "  ${CYAN}? $file${NC} ($status)" ;;
        esac
    done
    
    step "提交更改..."
    git commit -m "$1"
    success "提交完成"

    step "推送到 origin/$branch ..."
    git push origin "$branch"
    success "推送完成"
    
    # 显示最新提交信息
    echo -e "${BLUE}最新提交:${NC}"
    git log --oneline -1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
success "Stats API 提交完成 🚀 (耗时 ${DURATION} 秒)"

# 显示部署信息
echo ""
echo -e "${CYAN}📡 部署信息:${NC}"
echo "  • Vercel 自动检测更新并重新部署"
echo "  • API 地址: https://stats.lpblog.dpdns.org"
echo "  • 测试页面: https://stats.lpblog.dpdns.org/test.html"
echo ""
echo -e "${GREEN}🎉 全部完成！${NC}"