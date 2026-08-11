#!/usr/bin/env bash
# 仅提交并推送 Hermes 日记目录。供 laptop 上 Hermes / 宿主机调用。
# 用法: AGENT=az ./scripts/blog-diary-push.sh
# 凭证勿写进本脚本；依赖已配置的 git remote 鉴权。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIARY_PREFIX="docs/AI与生活/Hermes日记/"
AGENT="${AGENT:-hermes}"
MSG="${1:-}"

cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "refuse: not a git repo: $REPO_ROOT" >&2
  exit 1
fi

git pull --rebase --autostash

git add -- "docs/AI与生活/Hermes日记/"

# 拒绝日记目录以外的已暂存路径
bad="$(git diff --cached --name-only | grep -v "^${DIARY_PREFIX}" || true)"
if [[ -n "$bad" ]]; then
  echo "refuse: non-diary paths staged:" >&2
  echo "$bad" >&2
  git reset HEAD
  exit 1
fi

if git diff --cached --quiet; then
  echo "nothing to commit in diary"
  exit 0
fi

if [[ -z "$MSG" ]]; then
  MSG="[$AGENT] diary: $(date +%F)"
fi

git commit -m "$MSG"
git push origin HEAD:main

echo "ok: pushed diary as $AGENT"
