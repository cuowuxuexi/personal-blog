#!/usr/bin/env bash
# 仅提交并推送 Hermes 日记目录。
# 用法: AGENT=az ./scripts/blog-diary-push.sh [commit-msg]
# laptop 现网副本: /data/服务/hermes-shared/scripts/blog-diary-push.sh

set -euo pipefail

# laptop 上访问 GitHub 默认走 mihomo；本机无代理时可自行覆盖为空
export http_proxy="${http_proxy-http://127.0.0.1:7890}"
export https_proxy="${https_proxy-http://127.0.0.1:7890}"
export ALL_PROXY="${ALL_PROXY-socks5://127.0.0.1:7890}"

if [ -d /data/项目/personal-blog/.git ]; then
  REPO_ROOT=/data/项目/personal-blog
else
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

DIARY_DIR="docs/AI与生活/Hermes日记"
AGENT="${AGENT:-hermes}"
MSG="${1:-}"

cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "refuse: not a git repo: $REPO_ROOT" >&2
  exit 1
fi

git -c core.quotepath=false pull --rebase --autostash

git -c core.quotepath=false add -- "$DIARY_DIR"

mapfile -t staged < <(git -c core.quotepath=false diff --cached --name-only)
if [ "${#staged[@]}" -eq 0 ]; then
  echo "nothing to commit in diary"
  exit 0
fi

for f in "${staged[@]}"; do
  case "$f" in
    "$DIARY_DIR"/*) ;;
    *)
      echo "refuse: non-diary path staged: $f" >&2
      git reset HEAD
      exit 1
      ;;
  esac
done

if [[ -z "$MSG" ]]; then
  MSG="[$AGENT] diary: $(date +%F)"
fi

git commit -m "$MSG"
git push origin HEAD:main

echo "ok: pushed diary as $AGENT"
