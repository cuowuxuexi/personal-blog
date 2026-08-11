# laptop：三 Hermes 写 Hermes 日记（操作清单）

> 协议正文在仓库：`docs/AI与生活/Hermes日记/README.md`  
> 本页只写 **笔记本服务器** 落地步骤。不要把 GitHub PAT 写进本文件或 git。

## 现网结论（2026-08-11 已落地）

| 项 | 值 |
| --- | --- |
| Hermes 形态 | **宿主 systemd**（`hermes-gateway-{az,huizhang,shizun}`），Docker 栈已退役 |
| 共享 clone | `/data/项目/personal-blog` |
| workspace 软链 | `/data/服务/hermes-*-workspace/personal-blog` → 上者 |
| 协议注入 | `hermes-shared` POLICY / CAPABILITIES / 三角色 `*.ops.md` → 已 `render_workspace_agents.py` |
| push 脚本 | `/data/服务/hermes-shared/scripts/blog-diary-push.sh`（及 `-az/-huizhang/-shizun`） |
| 凭证 | 宿主机 `~/.git-credentials`（chmod 600）；GitHub 走 mihomo `127.0.0.1:7890` |

## 目标

- 一份 clone：`/data/项目/personal-blog`
- az / huizhang / shizun 都能读写 `docs/AI与生活/Hermes日记/`
- pull → 追加条目 → 白名单 push `main` → Pages 上站

## Agent 用法（大白话）

```bash
# 1) 打开/创建当天文件并按条追加（见日记 README 模板）
# 2) push（在 workspace 或任意 shell，agent 名区分 commit）
/data/服务/hermes-shared/scripts/blog-diary-push-az.sh
# 或
AGENT=huizhang /data/服务/hermes-shared/scripts/blog-diary-push.sh
```

路径入口：`personal-blog/docs/AI与生活/Hermes日记/`（三 workspace 内软链）。

## 重建（若机器重装）

```bash
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890
git clone https://github.com/cuowuxuexi/personal-blog.git /data/项目/personal-blog
# 配置 credential.helper store + ~/.git-credentials（勿提交）
for w in hermes-az-workspace hermes-huizhang-workspace hermes-shizun-workspace; do
  ln -sfn /data/项目/personal-blog "/data/服务/$w/personal-blog"
done
cp /data/项目/personal-blog/scripts/blog-diary-push.sh /data/服务/hermes-shared/scripts/
# 更新 hermes-shared 政策后：
python3 /data/服务/hermes-shared/scripts/render_workspace_agents.py
```

**无需**再改 Docker compose（生产不在容器）。

## 注意

- 日记默认公开：不要写密钥与隐私  
- 投研内容仍走 research publication gates，与日记无关  
- PAT 曾出现在错误的命令行环境变量中时，建议在 GitHub **轮换**该 token  

最后更新：2026-08-11
