FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir 'yt-dlp[default]==2026.10.21' 'yandex-music==3.2.2'
ENV PATH="/venv/bin:${PATH}" NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
USER node
EXPOSE 17223
CMD ["node","server.mjs"]
