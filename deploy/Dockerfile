# ANKUZO — production image.
#
# `next.config.ts` sets `output: "standalone"`, so `vinext build` emits a tree
# under dist/standalone with server.js and a partial node_modules.
#
# "Partial" is the important word: that tree carries vinext but not react, so
# it only runs when something further up the directory chain can supply the
# rest. Locally that happens by accident — the project's own node_modules sits
# two levels above dist/standalone. Reproducing it on purpose is what the two
# COPY lines in the runtime stage do: the standalone tree keeps its own
# node_modules at /app, and the production dependencies go to /node_modules,
# where Node looks next. Merging the two directories instead would risk the
# installed vinext shadowing the built one.

FROM node:22-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json ./
# Runtime dependencies only. The build toolchain never reaches the final image.
RUN npm ci --omit=dev --ignore-scripts


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

# The standalone tree is rooted at the working directory — server.js resolves
# ./dist and ./public relative to itself.
COPY --from=builder --chown=node:node /src/dist/standalone ./

# Resolution fallback, one level up. See the note at the top of this file.
COPY --from=deps --chown=node:node /src/node_modules /node_modules

# Never run the site as root; the node image ships an unprivileged `node` user.
USER node

EXPOSE 3000

# Caddy reaches this container over the `edge` network, so the check has to
# come from inside. A plain 200 on / proves SSR ran, not just that the port
# is open.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
