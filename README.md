# ANKUZO

Статический персональный игровой профиль со статистикой Steam, PlayStation и Discord.

## Запуск

Требуется Node.js 22 (версия, используемая в GitHub Actions).

```bash
npm test
npm run serve
```

`npm test` проверяет JavaScript, публичные JSON и собирает каталог `dist/`.

## Обновление данных

```bash
npm run update-data
```

Поддерживаемые переменные окружения:

- `STEAM_KEY` — Steam Web API;
- `PSN_NPSSO` и `PSN_ONLINE_ID` — PlayStation;
- `DISCORD_USER_ID` и `DISCORD_BIO` — Discord;
- `FACEIT_KEY` и `FACEIT_NICKNAME` — FACEIT;
- `TRN_KEY`, `TRN_PLATFORM`, `TRN_USERNAME` — Tracker Network.

Секреты не должны попадать в `data/`, историю Git или клиентский JavaScript. Если API недоступен, сохраняются предыдущие публичные данные со статусом `fallback/unavailable`; дата последнего успешного обновления не подменяется датой неудачной попытки.

## Структура

- `index.html` — семантика и контент страницы;
- `css/system.css` — дизайн и адаптив;
- `js/` — интерфейс и WebGL;
- `data/` — безопасные публичные данные;
- `scripts/update-data.js` — серверное обновление API;
- `scripts/build-static.js` — сборка `dist/`;
- `tests/` — проверки проекта.

GitHub Pages собирается из `dist/`. Публичные данные обновляются четыре раза в сутки; изменения только времени попытки не создают новый коммит.
