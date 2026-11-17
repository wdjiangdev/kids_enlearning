# kids_enlearning（英语乐园）

译林版小学英语学习站，线上地址：https://kids.6668800.xyz

- 前端：`web/` 纯静态页（学单词 / 音标 / 语法 / 练句子 / 背单词，含 `web/data/` 各册词表与课文数据）
- 后端：`server/app.py`（FastAPI / uvicorn），负责注册登录、学习进度，SQLite 存于 `data/app.db`
- 媒体：`media/` 课文音频（`lesson/`、`au/`）与配图（`img/`），容器内只读挂载
- 脚本：`scripts/` 数据加工脚本（拆分词表、生成课外数据、修正缩略形式）

## 本地 / 服务器运行

```bash
cp .env.example .env   # 填入 REGISTER_CODE
docker compose up -d --build
# 服务监听 127.0.0.1:18097 -> 容器 8000
```

## 不在仓库里的东西

- `.env`（含注册码 REGISTER_CODE，只存服务器）
- `data/app.db`（用户账号与学习进度数据库，只存服务器，见 DEPLOY.md 的备份说明）

部署架构与上线、更新、回滚步骤见 [DEPLOY.md](DEPLOY.md)。
