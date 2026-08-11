# laptop：三 Hermes 写 Hermes 日记（操作清单）

> 协议正文在仓库：`docs/AI与生活/Hermes日记/README.md`  
> 本页只写 **笔记本服务器** 落地步骤。不要把 GitHub PAT 写进本文件或 git。

## 目标

- 一份 clone：`/data/项目/personal-blog`
- az / huizhang / shizun 都能读写 `docs/AI与生活/Hermes日记/`
- pull → 追加条目 → push `main` → Pages 上站

## B. 共享 clone + 挂载

```bash
# 宿主机（cuowo）
sudo mkdir -p /data/项目
sudo chown cuowo:cuowo /data/项目
git clone https://github.com/cuowuxuexi/personal-blog.git /data/项目/personal-blog
# 或已有则：cd /data/项目/personal-blog && git pull --ff-only
```

Hermes compose（`/opt/stacks/hermes/compose.yaml`）增加 volume（与现有 workspace 并列）：

```yaml
# 示意，合并进现有 volumes 列表
- /data/项目/personal-blog:/data/项目/personal-blog
```

三 workspace 各建软链（方便 agent 在 cwd 附近找到）：

```bash
for w in hermes-az-workspace hermes-huizhang-workspace hermes-shizun-workspace; do
  ln -sfn /data/项目/personal-blog "/data/服务/$w/personal-blog"
done
```

重启 Hermes 栈（Dockge 或）：

```bash
cd /opt/stacks/hermes && docker compose up -d
```

验收：

```bash
docker exec hermes ls -la /data/项目/personal-blog/docs/AI与生活/Hermes日记
```

## C. Git 凭证与白名单 push

1. GitHub → Fine-grained PAT：仅 `cuowuxuexi/personal-blog`，Contents: Read and write  
2. 只存在宿主机（示例）：`~/.config/git-credentials` 或 `gh auth` / 环境文件，**chmod 600**  
3. 建议封装脚本（宿主机可执行，容器若挂了同路径也可调），核心逻辑：

```bash
REPO=/data/项目/personal-blog
cd "$REPO" || exit 1
git pull --rebase
# agent 已改好日记文件后：
git add docs/AI与生活/Hermes日记/
# 白名单：status 中不得出现日记目录以外的已暂存文件
git diff --cached --name-only | grep -v '^docs/AI与生活/Hermes日记/' && {
  echo "refuse: non-diary paths staged"; git reset HEAD; exit 1
}
git commit -m "[$AGENT] diary: $(date +%F)"
git push origin main
```

把 `$AGENT` 设为 `az` / `huizhang` / `shizun`。

容器内无 git 时：脚本放在宿主机，由 agent 通过 `docker exec` 宿主机侧已有能力调用——按现网 Hermes terminal 实际能力二选一，优先「在挂载的 repo 目录里直接 git」（UID 1000 可写 `.git`）。

## D. 烟测

1. 三 bot 各向**当天** `YYYY-MM-DD.md` 追加一条（`#N · HH:mm`）  
2. push 后看 GitHub commit 与 Pages  
3. Windows：`git pull` 应能看到同样内容  

## 注意

- 禁止 `docker system prune -a`  
- 日记默认公开：不要写密钥与隐私  
- 投研内容仍走 research publication gates，与日记无关  

最后更新：2026-08-11
