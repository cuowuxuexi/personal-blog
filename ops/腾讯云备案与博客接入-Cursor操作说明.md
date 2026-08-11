# 博客挂腾讯云 + ICP 备案 — Cursor 操作说明

> 大白话版。目标：用国内机 `guonei` 给 **`cuowocom.com`** 做备案接入，并挂上静态博客。  
> 原则：**UHT 是这台机主业，博客只做静态站；不在服务器上 build。**

> **域名变更（2026-08-10）：** `.win` **不能** ICP 备案。备案与国内公网博客改用 **`cuowocom.com`**（`.com`）。  
> 旧域 `blog.cuowo.win` 可继续当 Cloudflare Pages / 海外备份，**不再**作为备案主体。  
> 域名注册商侧现为 **Squarespace Domains**（NS：`nsd*.squarespacedns.com`）；DNS 建议迁 Cloudflare 后用 **灰云** 指 guonei。

---

## 你要达成的结果

1. 腾讯云 ICP 备案通过（主体：你本人）
2. `https://cuowocom.com`（及可选 `www`）解析到国内机，能打开博客
3. 页脚有备案号
4. 微信里不再因「未 ICP 备案」被死拦（可能仍有一次确认，视微信策略）

**不做什么：** 不做小程序；不在 guonei 上跑 `pnpm build`；不动 UHT 数据卷 `tracker-data`。

---

## 关键信息（写进说明，操作时照填）

| 项 | 值 |
|----|-----|
| 服务器别名 | `guonei` |
| 公网 IP | `114.132.244.14` |
| Tailscale | `100.88.115.43`（优先用这个 SSH） |
| SSH 密钥 | `C:\Users\74287\.ssh\id_ed25519_servers` |
| 博客域名 | `cuowocom.com`（可选 `www.cuowocom.com`） |
| 主域名（备案用） | `cuowocom.com` |
| 本地仓库 | `D:\项目\personal-blog` |
| 构建产物 | `docs/.vitepress/dist` |
| 服务器文档 | `D:\cxks\服务器\国内服务器\` |

登录示例（PowerShell）：

```powershell
$KEY = "C:\Users\74287\.ssh\id_ed25519_servers"
ssh -i $KEY root@100.88.115.43
# 备用：
ssh -i $KEY root@114.132.244.14
```

---

## 阶段总览（按顺序，别跳）

| 阶段 | 在哪做 | 做什么 | 大约耗时 |
|------|--------|--------|----------|
| A | 浏览器 + 腾讯云 | 查机器能否备案、域名实名 | 0.5h |
| B | 腾讯云备案控制台 | 提交个人备案 | 填表 1h；审核几天～两周 |
| C | Cursor / SSH | 服务器装 Nginx、目录、权限 | 0.5～1h |
| D | Cursor 本机 | 构建博客并上传 | 0.5h |
| E | 服务器 + 域名 DNS | HTTPS、解析、挂备案号 | 0.5～1h |
| F | 浏览器 / 微信 | 验收 | 15min |

**建议：A、B 先做；审核期间可做 C（准备环境），但 DNS 正式切到国内建议等备案初审/通过后再切（按腾讯云提示为准）。**

---

## 阶段 A — 开工前检查（今天就能做）

### A1. 腾讯云机器

浏览器打开 [腾讯云控制台](https://console.cloud.tencent.com/)：

- [ ] 能看到这台机，地域是**中国大陆**（不是香港/海外）
- [ ] 实例还在、没欠费
- [ ] 进入 [ICP 备案](https://console.cloud.tencent.com/beian/manage/welcome)，看这台资源是否**可用于备案**（有的要剩余时长够长）

### A2. 域名实名

- [ ] `cuowocom.com` 在注册商侧状态正常（Squarespace Domains；**退掉 Workspace 后仍要确认域名 auto-renew 与付款方式**）
- [ ] 腾讯云备案主体姓名 = 你本人身份证（与账号实名一致）
- [ ] 海外注册商域名：按腾讯云向导完成**域名权属验证**（常为 TXT）；新购域按提示满足等待期后再交（以页面为准）

### A3. 本机仓库能构建

在 Cursor 打开 `D:\项目\personal-blog`，终端执行：

```powershell
cd D:\项目\personal-blog
pnpm install
pnpm docs:build
```

- [ ] 成功生成目录：`docs/.vitepress/dist`
- [ ] 可选：`pnpm docs:preview` 本机预览正常

### A4. 服务器还活着（别盲上）

SSH 上去后执行：

```bash
free -m
df -h /
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
ss -lntp | head -50
```

对照：

| 检查 | 期望 |
|------|------|
| `available` 内存 | 尽量 **> 800MB**（文档红线） |
| 磁盘 | 有几 G 空闲即可（静态站很小） |
| UHT | `tracker-nginx` / `tracker-backend` 还在 |
| 80 / 443 | **最好还没被占用**（业务目前多在 8080、5678） |

若 `available` 很低：先别折腾博客，按 `D:\cxks\服务器\国内服务器\README.md` 看是否要先停 n8n 保命。

---

## 阶段 B — ICP 备案（人手，控制台）

### B1. 开始备案

1. 打开：https://console.cloud.tencent.com/beian/manage/welcome  
2. 选 **首次备案**（若主体从没备过）  
3. 按向导填：

| 项 | 建议填法 |
|----|----------|
| 主体 | **个人** |
| 姓名/证件 | 与域名实名、腾讯云账号实名一致 |
| 网站名称 | 个人博客类，按管局规则起名（不要太像公司名/经营性） |
| 域名 | **`cuowocom.com`**（不要填 `cuowo.win` / `.win`） |
| 服务内容 | 个人博客 / 学习分享（**不要**写成荐股、理财销售） |
| 接入 | 选这台 guonei 对应的服务器/IP |

4. 按提示做人脸核验、上传材料  
5. 等：腾讯云初审 → 工信部短信核验（**收到短信尽快点，常限 24h**）→ 省管局审核  

### B2. 审核期间你可以做

- 可以做阶段 C、D（准备环境、先传到服务器用 IP:端口 试）
- **不要急着**把全网 DNS 切走又切不回来；按腾讯云文档：有的步骤建议初审通过后再改解析

### B3. 备案通过后必做

- [ ] 记下 **备案号**（形如 `粤ICP备xxxxxxxx号`）
- [ ] 网站页脚展示备案号，并链到工信部查询（阶段 E 改主题/布局）

---

## 阶段 C — 服务器准备（Cursor 里 SSH 操作）

> 全部用 root SSH。任何 `docker` 清理：**禁止** `docker system prune -a`；禁止动卷 `tracker-data`。

### C1. 安装 Nginx（若未装）

```bash
# OpenCloudOS / RHEL 系常见写法，若命令不同用 dnf 搜 nginx
dnf install -y nginx
systemctl enable nginx
# 先别 reload 业务配置，等下面站点文件写好再开
nginx -v
```

若已装过，跳过安装，只检查：

```bash
nginx -t
systemctl status nginx --no-pager
```

### C2. 建站点目录

```bash
mkdir -p /var/www/blog
chown -R nginx:nginx /var/www/blog   # 用户组以系统为准，没有 nginx 用户可先 root 再调
# 若 chown 报错，可先：
# chown -R root:root /var/www/blog && chmod -R 755 /var/www/blog
```

### C3. 防火墙 / 安全组（两边都要开）

**服务器本机（若开了 firewalld）：**

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
# 没有 firewalld 可忽略
```

**腾讯云控制台 → 该实例安全组：**

- [ ] 入站放行 **TCP 80**
- [ ] 入站放行 **TCP 443**
- [ ] 22 / 8080 / 5678 保持你原有规则（别误关 SSH）

### C4. 写 Nginx 站点配置（先 HTTP，证书后面再加）

创建：`/etc/nginx/conf.d/cuowocom.com.conf`

```nginx
server {
    listen 80;
    server_name cuowocom.com www.cuowocom.com;

    root /var/www/blog;
    index index.html;

    # VitePress / SPA 式回退
    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }

    # 静态缓存（可按需调）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

检查并启动：

```bash
nginx -t && systemctl restart nginx
ss -lntp | grep -E ':80|:443'
```

- [ ] 80 在听  
- [ ] `curl -I http://127.0.0.1/` 或带 Host 测试（上传文件前可能是 403/空目录，属正常）

带 Host 测：

```bash
curl -I -H "Host: cuowocom.com" http://127.0.0.1/
```

---

## 阶段 D — 本机构建并上传（Cursor 本机终端）

### D1. 构建

```powershell
cd D:\项目\personal-blog
pnpm docs:build
```

产物：`D:\项目\personal-blog\docs\.vitepress\dist\`

### D2. 上传到服务器

**方式 1：scp（简单）**

```powershell
$KEY = "C:\Users\74287\.ssh\id_ed25519_servers"
# 先清空远端旧文件可选：ssh 里 rm -rf /var/www/blog/*
scp -i $KEY -r "D:\项目\personal-blog\docs\.vitepress\dist\*" root@100.88.115.43:/var/www/blog/
```

若 PowerShell 对 `*` 不友好，可先打包：

```powershell
$KEY = "C:\Users\74287\.ssh\id_ed25519_servers"
cd D:\项目\personal-blog\docs\.vitepress\dist
tar -cvf D:\项目\personal-blog\blog-dist.tar .
scp -i $KEY D:\项目\personal-blog\blog-dist.tar root@100.88.115.43:/tmp/
```

服务器上：

```bash
rm -rf /var/www/blog/*
tar -xvf /tmp/blog-dist.tar -C /var/www/blog/
# 权限
chmod -R a+rX /var/www/blog
```

### D3. 本机先不改 DNS 时的验证

```bash
# 在服务器上
ls -la /var/www/blog | head
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: cuowocom.com" http://127.0.0.1/
```

期望：`200`，且 `index.html` 存在。

浏览器临时测（hosts 或直接 IP，若只配了 server_name，用 hosts）：

- Windows：`C:\Windows\System32\drivers\etc\hosts` 临时加一行  
  `114.132.244.14 cuowocom.com`  
- 打开 `http://cuowocom.com`（先 HTTP）  
- 测完可删 hosts 行

---

## 阶段 E — HTTPS、解析、备案号

### E1. 申请证书（推荐 certbot；备案通过且 80 可达后再做最省事）

```bash
dnf install -y certbot python3-certbot-nginx
# DNS 已指向本机且 80 通时：
certbot --nginx -d cuowocom.com -d www.cuowocom.com
nginx -t && systemctl reload nginx
```

没有邮箱交互时按提示填；证书续期一般 certbot 会装定时任务。

### E2. DNS 解析（域名注册商或 Cloudflare DNS）

| 类型 | 主机记录 | 值 | 说明 |
|------|----------|-----|------|
| A | `@` | `114.132.244.14` | `cuowocom.com` → 国内机 |
| A | `www` | `114.132.244.14` | `www.cuowocom.com` → 国内机 |

注意：

- DNS 在 Cloudflare 时：**DNS only（灰云）**，先别橙云。  
- 域名若仍在 Squarespace NS：先把 NS 改成 Cloudflare 再在 CF 写记录；或暂在 Squarespace 写同样的 A 记录。  
- 旧 `blog.cuowo.win`（Pages）可作备份，与 `cuowocom.com` 备案互不影响。

### E3. 页脚挂备案号（改博客源码）

备案通过后拿到号，在 VitePress 主题/配置里加页脚，例如文案：

```text
粤ICP备xxxxxxxx号
```

链到：`https://beian.miit.gov.cn/`  

改完后重新走 **D1 → D2** 上传。

（具体改哪个文件：打开 `docs/.vitepress/config.mts` 或 `theme`，搜 footer；没有就加 `themeConfig.footer`。）

### E4. 确认 UHT 没被带崩

```bash
free -m
curl -s http://127.0.0.1:8080/api/health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

- [ ] UHT health 正常  
- [ ] available 仍健康  

---

## 阶段 F — 验收清单

| # | 检查 | 通过标准 |
|---|------|----------|
| 1 | `https://cuowocom.com` | 证书正常、首页能开 |
| 2 | 点几篇「投资哲学」等内页 | 不 404 |
| 3 | 页脚备案号 | 可点、号正确 |
| 4 | `http://114.132.244.14:8080` 或 UHT 原入口 | UHT 仍可用 |
| 5 | 微信里打开博客链接 | 不再只报「未完成 ICP 备案」死拦（以实际为准） |
| 6 | 服务器资源 | `free -m` / `df -h` 正常 |

---

## 以后更新博客（日常发布）

每次改完内容：

```powershell
cd D:\项目\personal-blog
pnpm docs:build
# 再按 D2 上传 dist 到 /var/www/blog
```

**不要**在服务器上 `git pull && pnpm install && pnpm docs:build`（内存容易炸）。

可选以后再做：GitHub Action 构建 → scp/rsync 到 guonei（自动化，非必须）。

---

## 和现有 Cloudflare Pages 的关系

| 方案 | 说明 |
|------|------|
| **推荐** | 备案与微信走 **`cuowocom.com` → guonei**；`blog.cuowo.win` / Pages 可当海外备份 |
| 双写 | 本机 build 一次，可同时 `wrangler pages deploy` + 上传 guonei（你愿维护再弄） |
| 只国内 | 只维护 `cuowocom.com` 即可 |

---

## 明确不要做的事

1. `docker system prune -a`
2. 删除或动 Docker 卷 **`tracker-data`**
3. `available < 800MB` 时批量装包、构建、清镜像
4. 在 guonei 上跑 `pnpm docs:build`
5. 占用/改掉 UHT 的 **8080** 端口去硬塞博客（博客用 80/443）
6. 备案材料写成经营性荐股、未持牌投顾

---

## 出问题怎么查

| 现象 | 先做 |
|------|------|
| 备案被驳回 | 看驳回原因：域名实名、网站名称、内容类型、材料照片 |
| 域名打开不是博客 | `ping cuowocom.com` 是否到 `114.132.244.14`；Nginx `server_name`；Cloudflare 是否橙云；NS 是否已是 CF |
| 502 / 空白 | `ls /var/www/blog`；`nginx -t`；`journalctl -u nginx -n 50` |
| HTTPS 失败 | 80 是否通、安全组、DNS 是否已指对本机 |
| SSH 很卡 | `free -m`；必要时腾讯云 VNC；可临时 `docker stop n8n n8n-guonei-postgres` 保 UHT |
| 微信仍提示 | 备案是否已「显示在工信部可查」；是否还在走旧缓存链接；可换链接再试 |

服务器总览与急救：`D:\cxks\服务器\国内服务器\README.md`  
接入方式：`D:\cxks\服务器\国内服务器\接入方式.md`

---

## 建议你在 Cursor 的打开方式

1. 窗口 1：打开文件夹 `D:\项目\personal-blog`（构建、改页脚、上传）  
2. 窗口 2：可选打开 `D:\cxks\服务器\国内服务器`（对照现网约束）  
3. 终端：本机 PowerShell 做 build/scp；SSH 进 guonei 做 Nginx  

**今天就能开工的最小动作：** 做完 **阶段 A 全部勾选** → 开始 **阶段 B 提交备案**。  
服务器 Nginx 可在填备案的当天或第二天做，不必等备案过完才学命令。

---

最后更新：2026-08-10（域名改为 cuowocom.com；.win 不可备案）
