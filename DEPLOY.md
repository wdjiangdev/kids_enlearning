# 部署方案

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

要点：

- 源站不对公网开放任何端口：容器只绑 127.0.0.1，全部流量经隧道进来。这台机的公网 443 是 Xray 节点，与本站无关，改节点配置不要动本站。
- 隧道是远程管理型：ingress 在 Cloudflare 控制台改，本机没有本地 config 文件；隧道令牌不在本仓库。

## 目录与数据（服务器 /opt/docker/kids-en）

| 路径 | 说明 | 进 Git |
|---|---|---|
| `server/` `web/` `scripts/` `media/` | 代码、前端、数据脚本、课文音频/配图 | 是 |
| `Dockerfile` `docker-compose.yml` | 构建与编排；compose 里的 `REGISTER_CODE` 从同目录 `.env` 读取 | 是（脱敏） |
| `.env` | 仅一行 `REGISTER_CODE=<注册码>`，权限 600 | 否 |
| `data/app.db` | SQLite 用户库（账号、会话、学习进度），bind 挂载到容器 `/data` | 否 |

## 从零部署

1. 把本仓库放到目标机 `/opt/docker/kids-en`，新建 `.env` 写入 `REGISTER_CODE`（向管理员索取，不要从任何仓库/聊天记录里找）。
2. `mkdir -p data media`（media 已随仓库分发可跳过；data 为空时后端首次启动自动建表）。
3. `docker compose up -d --build`
4. 本机验证：`curl http://127.0.0.1:18097/` 应返回首页 HTML（标题「英语乐园 · 译林版小学英语」）。
5. 在 Cloudflare 控制台给隧道加 ingress：`kids.6668800.xyz → http://127.0.0.1:18097`，并确认该子域 DNS 已指向隧道。
6. 公网验证：`curl -sI https://kids.6668800.xyz/` 返回 200、`Server: cloudflare`。

## 更新发布

```bash
cd /opt/docker/kids-en
# 同步新代码（git pull 或覆盖文件），注意不要覆盖 .env 和 data/
docker compose up -d --build
docker logs -f kids-en   # 看 uvicorn 是否正常起来
curl -s http://127.0.0.1:18097/ | head   # 本机先验
curl -sI https://kids.6668800.xyz/       # 再验公网
```

## 备份与回滚

- 数据库：定期拷 `data/app.db` 即可（SQLite 单文件）；恢复时停容器、换回文件、再启动。
- 代码回滚：git 回到上一个提交后重新 `docker compose up -d --build`。
- `.env` 单独保管一份（密码管理器），丢了注册码就没法开放新注册。

## 排障

- 公网 502 / 隧道报 `Unable to reach the origin service`：先查 `docker ps` 里 kids-en 是否 running，再查本机 18097 是否通；容器不在就是源站问题，容器在则是隧道问题（查 cloudflared 容器日志）。
- 本机直连公网 IP 的 80/443 测本站永远测不通（那是 Xray），不要用这种方式判断站点死活。
