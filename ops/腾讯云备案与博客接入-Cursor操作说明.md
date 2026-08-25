# 国内站 `cuowo.cn`（guonei）

> 现役 runbook。历史准备过程保存在私有运维档案，本仓不记录其绝对路径。
> 博客只做静态站乘客；UHT 是这台机主业。不在 guonei 上 `pnpm build`。

## 现役事实（2026-08-24）

| 项 | 值 |
|----|-----|
| 国内公网 | https://cuowo.cn 、 https://www.cuowo.cn |
| ICP 网站名 | 生活与学习记录 |
| ICP 号 | 闽ICP备2026032381号-1（页脚，链 `https://beian.miit.gov.cn/`） |
| 公网安备号 | 闽公网安备35018302000421号（页脚，链 `https://beian.mps.gov.cn/#/query/webSearch?code=35018302000421`） |
| 开通 / ICP 通过日 | 2026-08-21 |
| 公网安备挂上网日 | 2026-08-24 |
| 解析 | DNSPod `@` / `www` A → `114.132.244.14`（不要橙云） |
| 机器 | `guonei`，`114.132.244.14`；SSH 优先 Tailscale `100.88.115.43` |
| 站点目录 | `/var/www/blog` |
| Nginx | `/etc/nginx/conf.d/cuowo.cn.conf`（80→301，443） |
| 证书 | `/etc/letsencrypt/live/cuowo.cn/`，至 2026-11-19；certbot 自动续期 |
| 页脚代码 | `docs/.vitepress/config.mts` 的 `footer.copyright`；内页 `SiteBeian.vue`；图标 `/images/beian-mps.png` |
| 海外备份 | `https://blog.cuowo.win`（Cloudflare Pages）。`push main` **只更新 Pages** |
| 日常国内更新 | 发布面板确认发布：push 之后本机构建并上传 guonei，轮询 `https://cuowo.cn/build.json` |
| 公安联网备案 | 已通过；个人主体；属地 **闽侯**（非常住地≠接入商海淀） |

旧域：`cuowocom.com` 备案失败，不再当国内主域；其 Nginx/证书可仍留在机上。`.win` 不能备案。

## 红线

1. 禁止 `docker system prune -a`；禁止动卷 `tracker-data`
2. `available < 800MB` 停手
3. 博客只用 **80/443**，勿占 UHT **8080** / n8n **5678**
4. 不要删页脚 ICP 号或公网安备展示号
5. 不要把证件号、申请数据码写进公开 docs；页脚展示的公网安备号必须保留
6. 未获作者明确要求：Agent 不手动 upload guonei、不 push、不把 Pages 当成国内站已更新。作者在发布面板点「确认发布」会上传国内站，这是现役日常路径

## 日常更新国内站

周记 / 历程优先走发布面板（`pnpm panel`）。确认发布会：提交并 `push main`（海外 Pages 备份），再从快照做 `base=/` 生产构建、写入 `build.json`、传到 guonei。需要 Tailscale 与本机 `~/.ssh/id_ed25519_servers`（或 `.env` 的 `PANEL_GUONEI_KEY`）。

主题、投研页等不在面板范围内时，仍本机构建再上传（PowerShell 的 `tar` 不要用带盘符的绝对路径当归档路径，会被解析成远程主机）。手动上传也要写入 `build.json`，否则面板会认为国内站还停在旧提交：

```powershell
# 从仓库根执行
pnpm docs:build
$env:PANEL_BUILD_SHA = (git rev-parse HEAD)
node scripts/write-build-metadata.mjs

$KEY = $env:PANEL_GUONEI_KEY
if (-not $KEY) { throw 'PANEL_GUONEI_KEY is required' }
Push-Location docs\.vitepress\dist
if (Test-Path blog-dist.tar) { Remove-Item blog-dist.tar -Force }
tar -cf blog-dist.tar .
Pop-Location
scp -i $KEY docs\.vitepress\dist\blog-dist.tar root@100.88.115.43:/tmp/blog-dist.tar
```

服务器上：

```bash
rm -rf /var/www/blog.new /var/www/blog.old
mkdir -p /var/www/blog.new
tar -xf /tmp/blog-dist.tar -C /var/www/blog.new
rm -f /var/www/blog.new/blog-dist.tar
if [ -d /var/www/blog ]; then mv /var/www/blog /var/www/blog.old; fi
mv /var/www/blog.new /var/www/blog
chown -R nginx:nginx /var/www/blog
chmod -R a+rX /var/www/blog
curl -sI https://cuowo.cn | head
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/api/health
```

本机删掉 `docs/.vitepress/dist/blog-dist.tar`，勿提交。

登录：

```powershell
$KEY = $env:PANEL_GUONEI_KEY
if (-not $KEY) { throw 'PANEL_GUONEI_KEY is required' }
ssh -i $KEY root@100.88.115.43
```

## 公安备案（已通过，页脚已挂）

平台：[全国互联网安全管理服务平台](https://beian.mps.gov.cn/)。个人走「个人国际联网备案」。审核地按常住地址到闽侯，不是腾讯云海淀。页脚展示号 `闽公网安备35018302000421号`，与 ICP 并列。补材料或被打回时对照：

| 项 | 值 |
|----|-----|
| 网站名称 | 生活与学习记录（必须与 ICP 服务名一致） |
| 工信部备案号 | 闽ICP备2026032381号-1 |
| 开通日期 | 2026-08-21 |
| 主域名 / 从域名 | `cuowo.cn` / `www.cuowo.cn` |
| 访问地址 | `https://cuowo.cn` |
| IP | `114.132.244.14` |
| 接入商 | 腾讯云计算（北京）有限责任公司；北京市市辖区海淀区；租赁虚拟空间；4009100100 |
| 域名注册商 | 以域名证书为准（常见帝思普或腾讯云计算） |
| 交互 / 管制物品 / 前置许可 | 否 / 否 / 否 |
| 语种 | 中文简体 |
| 域名证书 | 腾讯云「我的域名」→ `cuowo.cn` → 更多 → 下载域名证书 → 转 png/jpg 上传 |

2026-08-24 已写入页脚（`SiteBeian.vue` + 首页 footer），链 `https://beian.mps.gov.cn/#/query/webSearch?code=35018302000421`。不要再当「等审未挂」。

## 验收

| 检查 | 期望 |
|------|------|
| https://cuowo.cn | 200，页脚有闽 ICP 号与公网安备号 |
| http://cuowo.cn | 301 → HTTPS |
| https://www.cuowo.cn | 200 |
| UHT `http://127.0.0.1:8080/api/health` | 200 |

微信若仍拦：确认工信部已能查到号，并走 `https://cuowo.cn` 而不是旧 `.win` / 未备案域。

最后更新：2026-08-24
