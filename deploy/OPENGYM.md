# openGym on the ankuzo host

A private workout tracker at `ankuzo.online/gym/`, and a read-only summary of
the numbers it produces published as a chapter of `ankuzo.online`.

Two halves, and they are deliberately separate:

- **openGym itself** is private. Only the owner ever signs in. It runs as its
  own container stack behind the same Caddy that already fronts everything on
  this host.
- **The site chapter** is public. It shows four coarse aggregates and nothing
  else, refreshed by the timer that already refreshes the Steam / PSN / Discord
  snapshots.

Nothing in here is done for you. Every step below is a command **you** run on
the host, in this order. The DNS record is first because nothing else works
without it.

---

## What gets published, and what never does

`ankuzo.online/data/body.json` is world-readable, permanently. It will be
scraped and cached by people who never asked, and once something is in there it
is out. So `scripts/publish-body.js` builds its output from an explicit
allowlist — field by field, by name, never by copying the source object.

**Published:**

- current weight, and its change across the period
- number of sessions in the period, and the current weekly streak
- total volume lifted in the period
- the main lift, and the best working set of it

**Never published:** workout dates or times, session names or notes, the plan,
per-session detail, injuries or any other health data, body measurements other
than weight, exercise-by-exercise history, the profile name, the openGym user
id.

The reason is not squeamishness. Coarse totals cannot be run backwards into a
daily schedule; a list of dates and clock times can, and a schedule says where
a person physically is at a given hour. If you ever edit `publish-body.js`,
keep the allowlist an allowlist: openGym is actively developed, and the day it
adds a field for sleep or resting heart rate, a `{...state}` would publish it
on the next timer tick and nobody would notice for months.

---

## Licence — AGPL-3.0

openGym is AGPL-3.0-or-later. `deploy/opengym.yml` runs the published upstream
images over the network; the site does not link openGym's code and does not
include any of it, so the site itself is unaffected.

The practical consequence, and the only one that will ever matter here: **if
you modify openGym's own source and serve the modified version to anybody, the
AGPL obliges you to offer them that modified source.** Section 13 covers users
reaching it over a network, so "it's only my server" is not an exemption once
anyone else can sign in. If you patch it, publish the patched tree (a fork on
GitLab is enough) and link it from the instance.

The exercise images and GIFs are *not* under the AGPL — the metadata is MIT and
the media is © Gym visual, used under the upstream dataset's terms. The `media`
container downloads them from their own source and this host never
redistributes them. Reusing that media yourself needs your own licence. See
upstream `NOTICE.md`.

---

## 1. No DNS record is needed

An earlier draft of this runbook put openGym on `ankuzo.online/gym/` and made an
A-record step 1. That is no longer the plan. It is served at
**`https://ankuzo.online/gym/`** instead: nothing to register, nothing to
propagate, no second certificate to obtain, and no new name that can expire or
be mis-delegated.

Hosting a single-page app under a path usually means rebuilding it with a base
path, which for an AGPL project means becoming a distributor of modified source.
That is avoided here, because three things upstream happen to line up. All three
were checked in the source, not assumed:

| what | where | why it matters |
|---|---|---|
| `base: './'` | `frontend/vite.config.js` | Built asset URLs are relative, so they resolve against `/gym/` unchanged. **No rebuild, no fork, no AGPL obligation.** |
| `HashRouter` | `frontend/src/App.jsx` | Every route lives after the `#`, so the path never deepens past `/gym/` and relative assets keep resolving on deep links. A `BrowserRouter` would have broken this. |
| `register('sw.js')` | `frontend/src/main.jsx` | Relative, with no scope override, so the service worker's scope is `/gym/`. It cannot reach, cache or interfere with the main site. |

The one trade, and it is worth understanding rather than skimming: **a passkey
registered here is valid for the whole of `ankuzo.online`, not only `/gym`.**
WebAuthn binds credentials to a domain, never to a path. That is fine while
every page on this domain is the owner's own, and it is the reason not to host
untrusted third-party content anywhere on this origin.

`/api`, `/img` and `/gif` are routed to openGym at the apex, because that is
where its frontend asks for them. Verified free first — the site is a single
page (`app/page.tsx`) with no API routes, and all three return 404 in production
today. If the main site ever grows a real `/api`, this is the thing that has to
be revisited.

---

## 2. Caddy site block

**Do not skip the backup and the validation.** The rule on this host is that
every Caddyfile change is backed up to `/root/backups-caddy/` first and
validated with `caddy validate` in a throwaway container before anything is
reloaded — the same Caddy fronts TeamSpeak, silentium, uptime-kuma and the site
itself, and a config that fails to parse takes all of them down at once.

Back up:

```sh
mkdir -p /root/backups-caddy
cp /opt/infrastructure/config/caddy/Caddyfile    /root/backups-caddy/Caddyfile.$(date +%Y%m%d-%H%M%S)
```

This is an edit to the **existing** `{$ANKUZO_DOMAIN:ankuzo.invalid}` block, not
a new site block. The bare `reverse_proxy ankuzo:3000` becomes a set of `handle`
blocks, because a site can only route by path once its directives are in
mutually exclusive handlers. Replace the block with:

```caddyfile
{$ANKUZO_DOMAIN:ankuzo.invalid} {
	encode gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	# openGym — private workout tracker, one user, reached only by its owner.
	# It is not a secret, it is just not a publication.
	header /gym* X-Robots-Tag "noindex, nofollow"

	# The trailing slash is load-bearing. openGym's assets are relative, so
	# from /gym they would resolve against the apex and 404 into the main
	# site; from /gym/ they resolve against /gym/ and hit nginx.
	handle /gym {
		redir https://{host}/gym/ permanent
	}

	# handle_path strips the prefix, so nginx receives / and serves the app
	# exactly as it would on its own hostname.
	handle_path /gym/* {
		reverse_proxy opengym-web:80
	}

	# Not stripped: the frontend asks for these at the root, and nginx inside
	# the web container is what proxies them on to the api and media
	# containers. One origin throughout, which is what WebAuthn requires —
	# split the app and its API across two hostnames and passkeys stop
	# working.
	handle /api/* {
		reverse_proxy opengym-web:80
	}
	handle /img/* {
		reverse_proxy opengym-web:80
	}
	handle /gif/* {
		reverse_proxy opengym-web:80
	}

	# Everything else is the site. This must come last: handle blocks are
	# evaluated in order and the first match wins.
	handle {
		# Hashed build output and fonts never change under the same URL. The
		# HTML itself is rendered per request and stays revalidated. The
		# matcher is anchored at the start of the path, so /gym/assets/* does
		# not match it and openGym keeps its own caching.
		@immutable path /_next/* /assets/* /fonts/*
		header @immutable Cache-Control "public, max-age=31536000, immutable"

		reverse_proxy ankuzo:3000
	}
}
```

Validate it in a throwaway container that never touches the running one, then
reload:

```sh
docker run --rm   -v /opt/infrastructure/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro   caddy:latest caddy validate --config /etc/caddy/Caddyfile

# only if that printed "Valid configuration"
docker exec -w /etc/caddy edge-caddy caddy reload --config /etc/caddy/Caddyfile
```

If the reload fails, restore the newest file from `/root/backups-caddy/` and
reload again before doing anything else.

Check the site itself still serves before going further — this edit touched its
routing, not just openGym's:

```sh
curl -s -o /dev/null -w "%{http_code}
" https://ankuzo.online/
# must print 200
```

---

## 3. Bring the stack up

`deploy/opengym.yml` publishes no host ports on purpose. Upstream's own compose
maps `WEB_PORT` to `0.0.0.0:8080`, which would put an authentication surface on
the open internet with no TLS in front of it — and passkeys would not work
there anyway, since they need the real HTTPS origin.

```sh
cd /opt/ankuzo/deploy
docker compose -f opengym.yml pull
docker compose -f opengym.yml up -d
```

The `opengym-media` container downloads about 140 MB of exercise images once,
then exits — that is expected, and `docker compose ps` showing it as `exited
(0)` is the healthy state. `opengym-api` and `opengym-web` should be `running`.

```sh
docker compose -f opengym.yml ps
docker compose -f opengym.yml logs opengym-api | tail -5
# gym-api on :3000 (rpID=ankuzo.online, origin=https://ankuzo.online)
```

Check that the RP id and origin in that log line are exactly right before you
register anything.

---

## 4. Create the owner account — order matters

`opengym.yml` ships with `INVITE_ONLY=1`. **That setting also refuses the very
first registration**, and the invite codes that would let it through can only
be minted from the admin dashboard, which needs an admin, which needs an
account. So the first account is created with the gate open, and the gate is
closed immediately afterwards.

**4a. Open the gate for one registration.** In `deploy/opengym.yml`, comment
out the `INVITE_ONLY: "1"` line under `opengym-api`, then:

```sh
docker compose -f opengym.yml up -d opengym-api
```

Leave `ALLOW_GUEST: "0"` as it is — it does not block registration.

**4b. Register.** Open `https://ankuzo.online/gym/` on the device whose passkey
you want to use, choose "Create profile", pick a name, and complete the
WebAuthn prompt. Do this from a device you will still have next year: the
private key never leaves it.

**4c. Make yourself admin and close the gate.** Read your uid out of the data
volume:

```sh
docker compose -f opengym.yml exec opengym-api \
  node -e "console.log(JSON.parse(require('fs').readFileSync('/data/db.json','utf8')).users.map(u=>u.id+' '+u.name).join('\n'))"
```

Put that id into `ADMIN_UIDS` in `deploy/opengym.yml` (uncomment the line), and
uncomment `INVITE_ONLY: "1"` again. Then:

```sh
docker compose -f opengym.yml up -d opengym-api
```

**4d. Confirm the gate actually closed.** Do not take the env var's word for
it. Two checks:

```sh
# The public config the frontend reads. Must be exactly this.
docker compose -f opengym.yml exec opengym-web \
  wget -qO- http://opengym-api:3000/api/config
# {"invite_only":true,"allow_guest":false}
```

And then the real one, from a browser — ideally a private window on a *second*
device, so a signed-in session is not confusing the picture:

1. Open `https://ankuzo.online/gym/`.
2. There must be **no** "Continue without account" button. If there is,
   `ALLOW_GUEST=0` did not take.
3. Choose "Create profile", enter any name, and submit **without** an invite
   code. It must fail with *"a valid invite code is required"* and no passkey
   prompt must appear. If a passkey prompt appears, stop — `INVITE_ONLY` is not
   in effect and the instance is open to anyone who finds the hostname.
4. Confirm your own account still signs in normally.

The attempt is recorded in `/data/audit.log` as `auth.register.denied`, which is
a second place to confirm it:

```sh
docker compose -f opengym.yml exec opengym-api tail -3 /data/audit.log
```

---

## 5. Back up the data volume

`opengym-data` is the only copy of the profile, the passkey public keys, the
session secret and every workout. Losing it means re-registering the passkey
and losing the history.

```sh
docker run --rm -v opengym_opengym-data:/data:ro -v /root/backups:/out alpine \
  tar czf /out/opengym-$(date +%F).tar.gz -C /data .
```

(Compose prefixes volume names with the project name, which `opengym.yml` sets
to `opengym` — hence `opengym_opengym-data`. Confirm with `docker volume ls`.)

---

## 6. Wire `publish-body.js` into the existing timer

The site's data already refreshes on a systemd timer:
`ankuzo-update.timer` → `ankuzo-update.service` → `/opt/ankuzo/deploy/update-data.sh`,
every six hours plus once five minutes after boot.

Neither unit file needs to change. `update-data.sh` does, in two places, and
`Dockerfile.updater` does not: it already `COPY`s the whole `scripts/`
directory, so `publish-body.js` is in the updater image as soon as the image is
rebuilt.

**6a. Rebuild the updater image** so it contains the new script:

```sh
cd /opt/ankuzo
docker build -f deploy/Dockerfile.updater -t ankuzo-updater:latest .
```

**6b. Find the state file.** openGym names it `state-<uid>.json`, with the uid
from step 4c:

```sh
docker run --rm -v opengym_opengym-data:/data:ro alpine ls /data
# db.json  state-<uid>.json  audit.log  secret  vapid.json
```

**6c. Edit `deploy/update-data.sh`.** Add a second `docker run` immediately
after the existing one — before the promote loop, so the new `body.json` is
picked up by the same validation and copied into `$DATA` like every other
snapshot:

```sh
# openGym → the public body summary. Reads the state file read-only out of the
# openGym data volume and writes an allowlisted aggregate into the staging
# directory; scripts/publish-body.js publishes nothing else. See OPENGYM.md.
#
# The `|| :` is deliberate. This script runs under `set -e`, and publish-body
# exits non-zero on purpose when the source is missing or malformed. Without
# the guard, one bad read here would abort the script before the promote loop
# and throw away the Steam/PSN/Discord snapshots that were just fetched
# successfully. Failing loudly means "do not publish", not "abandon the run":
# the previous body.json is already staged and gets promoted unchanged.
docker run --rm \
  -v "$STAGING":/app/public/data \
  -v "$GYM_STATE":/gym/state.json:ro \
  -e OPENGYM_STATE=/gym/state.json \
  -e BODY_PERIOD_DAYS="${BODY_PERIOD_DAYS:-90}" \
  -e OPENGYM_EXERCISES=/gym/exercises-data.js \
  -v "$GYM_EXERCISES":/gym/exercises-data.js:ro \
  "$IMAGE" node scripts/publish-body.js \
  || echo "body: unavailable; previous summary preserved" >&2
```

and add the two paths to the variable block at the top, beside `REPO`/`DATA`:

```sh
GYM_STATE=${GYM_STATE:-/var/lib/docker/volumes/opengym_opengym-data/_data/state-<uid>.json}
GYM_EXERCISES=${GYM_EXERCISES:-/opt/opengym/frontend/src/lib/exercises-data.js}
```

Notes on those two:

- `GYM_STATE` is the openGym state file. Reaching into
  `/var/lib/docker/volumes/.../_data` works and is the least moving parts, but
  it is a Docker implementation detail. If you would rather not depend on it,
  add `- opengym-data:/gym:ro` to a small helper or change `opengym.yml` to
  bind-mount `/opt/opengym-data` instead of using a named volume, and point
  `GYM_STATE` there. Either way it is mounted **`:ro`** into the updater — the
  publisher has no business writing to openGym's data.
- `GYM_EXERCISES` is optional and only ever used to turn an exercise id like
  `0025` into the words "barbell bench press". It is the upstream catalogue
  module from a `git clone` of openGym. Leave it out entirely and the lift is
  labelled by its id instead, or skip the clone and set
  `BODY_MAIN_LIFT_NAME="Barbell squat"` — the script takes an explicit name
  over anything it could look up.
- The updater image runs as uid 1000 (`node`). The openGym API runs as root, so
  its files are root-owned but world-readable, and the read-only mount works.
  If you ever change either, check with
  `docker run --rm -v opengym_opengym-data:/d:ro -u 1000 alpine cat /d/state-<uid>.json > /dev/null`.

**6d. Optional pinning.** By default the main lift is whichever exercise took
the most volume in the window. To publish a specific one, add to the `docker
run` above:

```sh
  -e BODY_MAIN_LIFT_ID=0025 \
  -e BODY_MAIN_LIFT_NAME="Barbell bench press" \
```

**6e. Run it once by hand and read the output:**

```sh
/opt/ankuzo/deploy/update-data.sh
# …
# Body: safe summary prepared (37 sessions / 90d, streak 13w, volume 62110 kg)
# updated body.json
cat /opt/ankuzo-data/body.json
```

**Read that file before you believe it.** It is the thing the whole internet
gets. Every field in it should be on the published list at the top of this
document, and nothing else should be there at all.

Then let the timer take over:

```sh
systemctl start ankuzo-update.service
systemctl list-timers ankuzo-update.timer
journalctl -u ankuzo-update.service -n 30
```

---

## 7. The site chapter — still to wire

The card and its styles exist but are not yet connected to anything:

- `components/portal/BodyCard.tsx` — the component. Self-contained; it fetches
  `/data/body.json` itself and degrades to a quiet placeholder when the file is
  absent, and marks itself out of date when the snapshot is older than two
  weeks.
- `app/body.css` — its styles. **Imported by nothing.** Add
  `@import "./body.css";` near the top of `app/globals.css` when the chapter
  goes in.
- The chapter still has to be placed in the scroll sequence
  (`components/portal/PortalExperience.tsx`, `components/portal/progress.ts`).
  That was deliberately left alone; do it once the other work in those files
  has landed.

Until then, `body.json` is published and simply unread by the site — which is
harmless, and lets you check the output for a few timer ticks before anything
is visible.

---

## Blocked on you, in order

1. The `ankuzo.online/gym/` A-record (§1). Everything else waits on it.
2. The Caddy site block, backed up and validated (§2).
3. Bringing the stack up (§3).
4. The one-time open-gate registration and closing it again, including the
   second-signup check (§4).
5. A backup of `opengym-data` (§5).
6. The `update-data.sh` edit, the updater rebuild and the first manual run (§6).
7. Wiring the chapter into the scroll sequence and importing `body.css` (§7).
