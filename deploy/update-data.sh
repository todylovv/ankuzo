#!/bin/sh
# Refresh the public profile snapshots in place.
#
# Runs from a systemd timer on the host. The updater writes straight into the
# directory the site serves, so new data is live as soon as this finishes —
# there is no rebuild and no redeploy in the loop.
#
# Credentials come from /etc/ankuzo/update.env, which stays on the server:
#
#   STEAM_KEY=...        # https://steamcommunity.com/dev/apikey
#   STEAM_IDS=id1,id2
#   PSN_NPSSO=...        # https://ca.account.sony.com/api/v1/ssocookie while signed in
#   PSN_ONLINE_ID=ankkui
#   DISCORD_USER_ID=514852654552186880
#   DISCORD_BIO=...
#
# Discord needs none of those — it resolves from the public id alone — so the
# file may hold only what is available and the rest simply stays as it was.
set -eu

REPO=${REPO:-/opt/ankuzo}
DATA=${DATA:-/opt/ankuzo-data}
ENV_FILE=${ENV_FILE:-/etc/ankuzo/update.env}
IMAGE=ankuzo-updater:latest

[ -d "$DATA" ] || { echo "data directory $DATA is missing" >&2; exit 1; }

# Write to a staging copy first: a half-written snapshot served to a visitor is
# worse than yesterday's complete one.
STAGING=$(mktemp -d "${DATA%/}.staging.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
cp "$DATA"/*.json "$STAGING"/ 2>/dev/null || true
# The updater image drops to the unprivileged `node` user (uid 1000), so the
# staging directory has to belong to it or every write fails with EACCES.
chown -R 1000:1000 "$STAGING"

docker run --rm \
  ${ENV_FILE:+$([ -f "$ENV_FILE" ] && echo "--env-file $ENV_FILE")} \
  -v "$STAGING":/app/public/data \
  "$IMAGE"

# Only promote files that are valid JSON and not empty.
for file in "$STAGING"/*.json; do
  [ -s "$file" ] || continue
  name=$(basename "$file")
  if docker run --rm -v "$STAGING":/d "$IMAGE" node -e "JSON.parse(require('fs').readFileSync('/d/$name','utf8'))" >/dev/null 2>&1; then
    cp "$file" "$DATA/$name"
    echo "updated $name"
  else
    echo "skipped $name: not valid JSON" >&2
  fi
done
