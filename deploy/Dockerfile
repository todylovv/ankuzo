# ANKUZO — production image.
#
# `next.config.ts` sets `output: "standalone"`, so `vinext build` emits a
# self-contained tree under dist/standalone: server.js plus its own
# node_modules, dist and public. Nothing has to be installed at runtime, which
# keeps the final layer small and means the runtime stage never sees the build
# toolchain or the dev dependencies.

FROM node:22-alpine AS builder
WORKDIR /src

# Dependencies first: this layer only invalidates when the lockfile moves,
# so day-to-day source edits reuse the cached install.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone tree is already rooted correctly — server.js resolves ./dist
# and ./public relative to itself, so it becomes the whole working directory.
COPY --from=builder --chown=node:node /src/dist/standalone ./

# Never run the site as root; the node image ships an unprivileged `node` user.
USER node

EXPOSE 3000

# Caddy reaches this container over the `edge` network, so the check has to
# come from inside. A plain 200 on / proves SSR ran, not just that the port
# is open.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
