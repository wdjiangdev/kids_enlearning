# 部署方案（Docker）

本站用 Docker Compose 部署：一个容器跑全部服务（FastAPI 后端 + 静态前端 + 媒体文件），数据用目录挂载持久化，不依赖外部数据库。

## 线上架构

```
用户浏览器
  │  https://kids.6668800.xyz
  ▼
Cloudflare（DNS 代理开启，橙色云朵；域名 6668800.xyz 托管在 CF）
  │  Cloudflare Tunnel（远程管理型隧道，入口规则在 CF 控制台维护）
  ▼
us1arm01（甲骨文圣何塞 ARM01，#15，155.248.202.68，Ubuntu 22.04 ARM）
  ├─ cloudflared 容器（与 panel / delernen / aspice / fshu / wake 等子域共用同一条隧道）
  │    ingress: kids.6668800.xyz → http://127.0.0.1:18097
  └─ kids-en 容器（Docker Compose，目录 /opt/docker/kids-en）
       127.0.0.1:18097 → 容器 8000（uvicorn server.app:app）
       内存上限 256m，restart: unless-stopped
```

## 前置要求

目标机装好 Docker Engine 和 Compose v2 插件，先自检：

```bash
docker --version
docker compose version
docker ps    # 能正常列出（权限没问题）再继续
```

## 镜像怎么构建（Dockerfile）

- 基础镜像 `python:3.12-slim`，工作目录 `/app`
- 先单独拷 `server/requirements.txt` 装依赖（利用层缓存，改代码不用重装依赖）
- 再拷入 `server/` 和 `web/`；`media/` 和 `data/` 不进镜像，运行时挂载
- 启动命令：`uvicorn server.app:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips 127.0.0.1`
- 容器内环境变量由 Dockerfile 写死：`DB_PATH=/data/app.db`、`WEB_DIR=/app/web`、`MEDIA_DIR=/media`

## 编排怎么跑（docker-compose.yml）

| 项 | 值 |
|---|---|
| 容器名 | `kids-en` |
| 端口 | 宿主机 `127.0.0.1:18097` → 容器 `8000`（只绑本机回环，不直接对外） |
| 环境变量 | `REGISTER_CODE`，从同目录 `.env` 注入（见下方第 3 步） |
| 挂载 | `./data → /data`（读写，存 SQLite）；`./media → /media`（只读） |
| 资源/重启 | 内存上限 256m；`restart: unless-stopped`（开机/崩溃自动拉起） |

## 从零部署（照抄即可）

```bash
# 1. 拉代码（私有仓，需要有权限的 GitHub 账号）
git clone https://github.com/wdjiangdev/kids_enlearning.git /opt/docker/kids-en
cd /opt/docker/kids-en

# 2. 准备数据目录（media 已随仓库带全，不用另备）
mkdir -p data

# 3. 写注册码（真实值向管理员索取，不要从任何仓库/聊天记录里找）
printf 'REGISTER_CODE=填真实注册码\n' > .env
chmod 600 .env

# 4. 构建并启动
docker compose up -d --build

# 5. 验证（三步都要过）
docker ps | grep kids-en                       # 状态 Up
docker logs kids-en --tail 20                  # uvicorn 正常监听 8000，无报错
curl -s http://127.0.0.1:18097/ | head -c 200  # 返回首页 HTML，标题「英语乐园」
```

## 对外发布

容器只监听 127.0.0.1，Docker 部署本身到上一步就完成了；公网访问需要再接一层，二选一：

- **线上现用（Cloudflare Tunnel）**：在 CF 控制台给隧道加 ingress `kids.6668800.xyz → http://127.0.0.1:18097`，子域 DNS 指向隧道。隧道是远程管理型，本机没有本地配置文件，令牌不在本仓库。
- 换机/自备域名时也可用任意反向代理（Nginx / Caddy）把域名转发到 `127.0.0.1:18097` 并签 TLS 证书，效果等价。

公网验收：`curl -sI https://kids.6668800.xyz/` 返回 200。

## 日常运维

```bash
cd /opt/docker/kids-en
docker compose ps             # 看状态
docker compose logs -f        # 跟日志
docker compose restart        # 重启（不重构建）
docker compose down           # 停并删容器（data/ 和 media/ 在宿主机，不受影响）
docker compose up -d          # 重新拉起
docker exec -it kids-en sh    # 进容器排查
```

## 更新发布

```bash
cd /opt/docker/kids-en
git pull                      # .env 和 data/ 不在 git 里，不会被覆盖
docker compose up -d --build  # 重构建并滚动换容器
docker logs kids-en --tail 20
curl -s http://127.0.0.1:18097/ | head -c 200   # 本机先验
curl -sI https://kids.6668800.xyz/              # 再验公网
```

## 备份与回滚

- 数据库：定期拷 `data/app.db` 即可（SQLite 单文件）；恢复时 `docker compose down`、换回文件、再 `up -d`。
- 代码回滚：`git checkout <上一个提交>` 后 `docker compose up -d --build`。
- `.env` 单独保管一份（密码管理器），注册码丢了就没法开放新注册。

## 排障

- 容器起不来：先看 `docker logs kids-en`，多半是 `.env` 缺失/注册码没注入，或 18097 被占用（`ss -tlnp | grep 18097`）。
- 公网 502 / 隧道报 `Unable to reach the origin service`：先按上面第 5 步查容器和本机 18097；容器正常就是隧道问题，查 cloudflared 容器日志。
- 本机直连公网 IP 的 80/443 测本站永远测不通（线上那台机 443 是 Xray），不要用这种方式判断站点死活。
