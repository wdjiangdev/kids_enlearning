FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt server/
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server server
COPY web web
ENV DB_PATH=/data/app.db WEB_DIR=/app/web MEDIA_DIR=/media
EXPOSE 8000
CMD ["uvicorn","server.app:app","--host","0.0.0.0","--port","8000","--proxy-headers","--forwarded-allow-ips","127.0.0.1"]
