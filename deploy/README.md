# Деплой ANKUZO

Сайт живёт на собственном VPS и **встраивается в уже работающую инфраструктуру**,
а не разворачивается рядом с ней. На хосте есть `edge-caddy`, который занимает
80 и 443 и проксирует остальные сервисы по имени контейнера в общей сети `edge`.
ANKUZO подключается тем же способом.

> На сервере работают TeamSpeak, silentium, WireGuard, xray и мониторинг.
> Любая правка Caddy или compose делается только через бэкап и валидацию —
> порядок описан ниже.

## Схема

```
интернет → edge-caddy (TLS) → ankuzo:3000 (контейнер в сети edge)
```

Контейнер **не публикует портов наружу**. Наружу смотрит только Caddy, поэтому в
`ufw` ничего открывать не нужно.

Образ двухстадийный: сборка отдельно, рантайм отдельно. `next.config.ts` включает
`output: "standalone"`, поэтому в финальный слой попадает только собранное
дерево — ни devDependencies, ни тулчейна.

## Что нужно один раз

**DNS.** Две A-записи у регистратора на IP сервера:

```
@     A    <IP сервера>
www   A    <IP сервера>
```

Caddy выпустит сертификаты сам, как только домен начнёт резолвиться. Апекс
канонический, `www` отдаёт постоянный редирект на него.

**Переменная окружения.** В `/opt/infrastructure/.env`:

```
ANKUZO_DOMAIN=ankuzo.online
```

И проброс в контейнер Caddy, в `compose/edge.yml`:

```yaml
ANKUZO_DOMAIN: ${ANKUZO_DOMAIN:-ankuzo.invalid}
```

Дефолт `.invalid` намеренный — он повторяет приём с `STATUS_DOMAIN`. Пока
переменная не задана, блок не совпадает ни с одним доменом, и Caddy не пытается
получить сертификат на несуществующий адрес.

**Блок в Caddyfile.** Содержимое [`Caddyfile.snippet`](Caddyfile.snippet)
дописывается в `/opt/infrastructure/config/caddy/Caddyfile`.

## Выкладка

```bash
git clone --branch experience https://github.com/todylovv/ankuzo.git /opt/ankuzo
```

```bash
cd /opt/ankuzo/deploy && docker compose -f ankuzo.yml up -d --build
```

Обновление после пуша:

```bash
cd /opt/ankuzo && git pull && cd deploy && docker compose -f ankuzo.yml up -d --build
```

Сборка занимает около минуты и требует примерно 2 ГБ памяти.

## Правка Caddy: обязательный порядок

Так как через этот Caddy ходят все сайты хоста, порядок именно такой.

**1. Бэкап вне git-репозитория инфраструктуры**, чтобы не засорять его историю:

```bash
mkdir -p /root/backups-caddy && cp /opt/infrastructure/config/caddy/Caddyfile /root/backups-caddy/Caddyfile.$(date +%F-%H%M%S).bak
```

**2. Валидация во временном контейнере** — работающий при этом не трогается:

```bash
cd /opt/infrastructure && . ./.env && docker run --rm -e SITE_ADDRESS="$DOMAIN" -e STATUS_DOMAIN="${STATUS_DOMAIN:-status.invalid}" -e ANKUZO_DOMAIN="${ANKUZO_DOMAIN:-ankuzo.invalid}" -v /opt/infrastructure/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2.8-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Продолжать можно только после `Valid configuration`.

**3. Применение.** Если менялся только Caddyfile — горячая перезагрузка, без
простоя для остальных сайтов:

```bash
docker exec -w /etc/caddy edge-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Если добавлялась или менялась переменная окружения, контейнер нужно пересоздать —
это несколько секунд недоступности **всех** сайтов хоста:

```bash
cd /opt/infrastructure && docker compose --env-file .env -f compose/edge.yml -p edge up -d
```

**4. Проверка**, что соседи живы:

```bash
docker ps --format '{{.Names}} | {{.Status}}' | sort
```

## Откат

```bash
cp /root/backups-caddy/<нужный бэкап> /opt/infrastructure/config/caddy/Caddyfile && docker exec -w /etc/caddy edge-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Вернуть предыдущую версию сайта, не трогая Caddy:

```bash
cd /opt/ankuzo && git checkout <коммит> && cd deploy && docker compose -f ankuzo.yml up -d --build
```

## Диагностика

```bash
docker logs ankuzo --tail 50
```

Проверить ответ изнутри сети, минуя TLS и DNS:

```bash
docker run --rm --network edge alpine/curl -s -o /dev/null -w '%{http_code}\n' http://ankuzo:3000/
```

Если контейнер перезапускается с `ERR_MODULE_NOT_FOUND` — это про то, что
standalone-дерево vinext неполно: оно содержит `vinext`, но не `react`.
Поэтому в образе production-зависимости лежат в `/node_modules`, уровнем выше
приложения, где Node их и ищет. Подробности — в комментарии к
[`Dockerfile`](Dockerfile).

## Ещё не сделано

- Автодеплой из GitHub Actions по пушу в `experience`. Сейчас выкладка ручная.
- Заголовки `COOP`/`COEP` для кросс-изоляции. Готовый блок лежит в
  `Caddyfile.snippet` закомментированным. Включать нельзя до тех пор, пока
  обложки игр тянутся напрямую с CDN Steam: с `COEP: require-corp` любой
  сторонний ресурс без `CORP` перестанет загружаться, и глава Library сломается.
