#!/bin/bash
# AI Ready Suite — 激活码生成包裹脚本
# 用法: ./tools/gen-key.sh <邮箱/标识> <有效天数>

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR" || exit 1

# 如果 AI_READY_SECRET 未设置，尝试从 .env 加载
if [ -z "$AI_READY_SECRET" ] && [ -f ".env" ]; then
  set -a; source .env; set +a
fi

if [ -z "$AI_READY_SECRET" ]; then
  echo "❌ 错误：AI_READY_SECRET 环境变量未设置"
  echo ""
  echo "请在项目根目录下创建 .env 文件："
  echo '  AI_READY_SECRET="你的密钥"'
  echo ""
  echo "或在 ~/.zshrc 中添加："
  echo '  export AI_READY_SECRET="你的密钥"'
  echo ""
  echo "然后执行：source ~/.zshrc"
  exit 1
fi

node tools/generate-key.js "$@"
