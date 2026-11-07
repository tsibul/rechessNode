# Аудит безопасности reChess (ветка `dev`)

Объём: backend (Express + TS + knex + mysql2 + zod + JWT-cookie + scrypt + multer + sharp + nodemailer) и frontend (Vue 3 + vite-ssg + CMS). Код не менялся. Секреты из `.env` в отчёт не попали.

Метод: чтение кода; динамические зонды (supertest на локальном backend и БД `rechess`, тестовые данные удалены); `npm audit` (только чтение).

## Итог

| Серьёзность | Находок |
|---|---|
| Критично | 0 |
| Высоко | 3 |
| Средне | 7 |
| Низко | 8 |

Главное:
1. Хранимый XSS через `v-html` с HTML из CMS без санитайзера (H-1) — редактор может стать админом.
2. Уязвимые продовые зависимости (H-2), в том числе `jws` (проверка HMAC JWT) и `proxy-addr`/`express` (подмена IP).
3. Нет заголовков безопасности (M-1) и надёжного лимита входа (M-2).

## Статус исправлений

Ветка `claude/security-audit-1fcc11`. Все находки ниже — состояние на момент аудита; здесь — что сделано.

| # | Статус | Что сделано / почему не сделано |
|---|---|---|
| H-1 | Исправлено | HTML из CMS чистится на сервере при сохранении (`sanitize-html`: блоки страниц — все строки с разметкой, настройки типа `html`) и ещё раз в браузере перед `v-html` (DOMPurify, `frontend/src/seo/sanitize.ts`). Разрешены p, br, a, b/strong, i/em, заголовки, списки, таблицы, img и т. п.; скрипты, обработчики событий и `javascript:` удаляются. Тексты политик и «О компании» (p, br, a, b) не меняются. Отдельный origin для CMS не вынесен (решение по инфраструктуре). `sanitize-html` закреплён на 2.17.1: более поздние версии требуют ESM-only htmlparser2, который jest и CJS-сборка не загружают. |
| H-2 | Исправлено (остатки low/сборка) | Обновлены все, что обновляется без мажорных версий (`npm audit fix`); `nodemailer` 10.3.1 (мажорное, тесты проходят); удалены неиспользуемые `mariadb` и `@vueuse/head`. `sanitize-html` обновлён до 2.18.1 (устранена moderate-находка; требует Node ≥ 22.12, в `backend/package.json` добавлен `engines`). `zod` обновлён до 4.x (схемы переписаны, уязвимость устранена; тексты ошибок возвращены к формулировкам zod 3 через `backend/src/zodMessages.ts`). Остались: backend — `deepmerge` (low, через jest: исправление — понижение jest до 25, не применимо); во всём дереве с dev-зависимостями backend 8 (6 low — цепочка jest; 2 moderate — `minimatch`/`typedoc`), frontend 2 moderate (`minimatch`/`typedoc`): с `minimatch` 11 `typedoc` не запускается, генерация документации; в сборку и на сервер не попадает; `npm audit --omit=dev` backend — 0; frontend prod — `picomatch` (через `vite-plugin-pages`, только на сборке), `unhead` ≤2.1.12 (через `vite-ssg`, только на сборке), 1 low. dev-инструменты (vitest, vitepress и др.) не трогались. |
| H-3 | Исправлено | Seed и раньше отказывался при `NODE_ENV=production`; теперь отказывается и при нелокальном `DB_HOST` без `ALLOW_DEV_SEED=1`. |
| M-1 | Исправлено в backend | `helmet` (nosniff, HSTS, CSP `default-src 'none'`, frame-ancestors none и др.), `X-Powered-By` выключен. CSP и заголовки страницы сайта остаются за nginx (этап 12) — не сделано. |
| M-2 | Исправлено | Добавлен лимит неудачных входов по IP (20/15 мин) сверх `логин+IP`; счётчики чистятся; `trust proxy` по умолчанию `loopback` (XFF верится только от прокси на той же машине; `TRUST_PROXY` переопределяет), добавлен `HOST` (на сервере `127.0.0.1`). nginx должен слать `X-Forwarded-For $remote_addr`. |
| M-3 | Исправлено | Токен несёт штамп сессии (`user.hashToken`, старый неиспользуемый столбец, миграция не нужна); выход и смена пароля пользователя меняют штамп и отзывают все его токены. Токены, выданные до обновления, перестанут работать (один повторный вход). Алгоритм закреплён: HS256. |
| M-4 | Исправлено | `assertConfig()` при старте: в production нужны `JWT_SECRET` ≥ 32 символов (не `change-me`) и https `FRONTEND_URL`; без `NODE_ENV` — предупреждение. |
| M-5 | Частично | Лимит 5 заказов в час на один e-mail (сверх лимита по IP). Подтверждение адреса и чистка гостевых клиентов не сделаны (меняют поведение заказа). |
| M-6 | Исправлено | `nosniff` через helmet, CSP на API. Загрузка очищается перед сохранением (`backend/src/services/imageClean.ts`): у JPEG и PNG метаданные (EXIF с GPS, XMP, комментарии, текстовые чанки) и байты после конца изображения удаляются на уровне контейнера, пиксели не перекодируются (вид фото не меняется); ориентация EXIF у JPEG сохраняется минимальным блоком. WebP и AVIF перекодируются (quality 92 / 80). Файл, который не читается как изображение, отклоняется (400). Уже загруженные ранее файлы не переписывались. |
| M-7 | Не сделано | Построчный разбор `frontend/src/cms` не проводился; `v-html` и `innerHTML` в CMS-компонентах не найдены. |
| L-1 | Оставлено | Смена N требует maxmem и перехеширования при входе — отдельная задача. |
| L-2 | Оставлено | Изменит правила для пользователей CMS. |
| L-3 | Исправлено | `photoName` не принимает имена из одних точек. |
| L-4 | Оставлено | Поле типа «фото»; существующие значения могут быть адресами. |
| L-5 | Исправлено | В письмо попадает только ссылка `http(s)://`. |
| L-6 | Исправлено | Повторная оплата проверяет `assertPaymentAvailable()`. |
| L-7 | Исправлено | В production `FRONTEND_URL` обязателен (см. M-4). |
| L-8 | Оставлено | Риска нет, пока env не контролируется извне. |

Проверка после исправлений: jest 140 тестов, vitest 106, `tsc`, `vue-tsc`, сборка frontend (`vite-ssg`) — зелёные; Playwright 72 из 72 в пяти прогонах подряд (нестабильность устранена: опрос публикации ждёт конкретный запуск по id, таблица «Публикация» прокручивается внутри обёртки). После очистки загрузок и sanitize-html 2.18.1: jest 140, vitest 106, lint, `tsc`, `vue-tsc`, Playwright 72 из 72 два прогона подряд.

## Зависимости инструментов разработки (ноябрь 2026)

Обновлены инструменты разработки без изменения поведения сайта. Ограничение: Node 22.22.1 и npm 9.2.0, версии с `engines` выше (например, `^22.22.2`) не ставились, `npm ci` проходит без EBADENGINE.

| Пакет | Было | Стало |
|---|---|---|
| `eslint` (backend, frontend) | 8.57 | 10.14 (flat config `eslint.config.js`, правила jsdoc и `noInlineConfig` сохранены) |
| `@typescript-eslint/parser` | 7.18 | заменён на `typescript-eslint` 8.72 (peer eslint ^10) |
| `eslint-plugin-vue` (frontend) | 9.33 | 10.12 (+ `vue-eslint-parser` 10); в конфиг не подключён, как и раньше |
| `@vue/eslint-config-typescript` (frontend) | 12 | удалён (в конфиге не использовался, тянул уязвимые пакеты) |
| `eslint-plugin-jsdoc` | 63.3.3 | без изменений (следующие версии требуют Node ^22.22.2) |
| `jest` (backend) | 29.7 | 30.5 (`ts-jest` 29, `@types/jest` 30) |
| `vitest` (frontend) | 3.2 | 5.1 (`@types/node` frontend 20 → 22) |
| `@vue/test-utils` | 2.5.1 | закреплён на `~2.4.11`: 2.5.x тянет `js-beautify` 2 → `nopt` 10 с engines `^22.22.2` |
| `playwright` (e2e) | <1.55.1 | 1.65 |
| `minimatch`, `glob` (dev-цепочки) | 9–10 | `overrides` в `backend/package.json` и `frontend/package.json`: `minimatch` 11.0.5, `glob` 14.0.4; для `typedoc` минимум `minimatch` остаётся 10.2.6, потому что typedoc 0.28 несовместим с 11 (`matchOne is not a function`) |

`npm audit` до → после:

| Папка | До | После (все) | После (`--omit=dev`) |
|---|---|---|---|
| backend | 12 (7 low, 5 moderate) | 9 (6 low, 3 moderate) | 2 (1 low, 1 moderate) |
| frontend | 17 (1 low, 7 moderate, 7 high, 2 critical) | 2 moderate | 0 |
| e2e | 2 high | 0 | 0 |

high и critical устранены везде. Остались:

- **backend, `deepmerge` ≥4.2.0 (prototype poisoning в `mergeObject()`)**: приходит из `sanitize-html` (prod) и из `jest-config` (dev). Исправленной версии `deepmerge` нет (4.3.1 последняя). В `sanitize-html` 2.18.1 зависимость убрана, но эта версия ESM-only и ломает jest (6 из 12 наборов падают), поэтому остаётся закреплённая 2.17.1 (см. H-1). Эксплуатация требует передать недоверенный объект в `mergeObject()`; `sanitize-html` вызывает его только со своими опциями.
- **backend и frontend, `minimatch`/`typedoc` (DoS при разборе glob-шаблонов)**: `typedoc` 0.28 не работает с `minimatch` 11. Только dev-инструмент документации, шаблоны задаёт `typedoc.json`, не пользователь.

Корневой `package.json` не менялся.

## Находки

### Высоко

| # | Где | Описание | Как воспроизвести | Как исправить |
|---|---|---|---|---|
| H-1 | `frontend/src/components/blocks/TextBlock.vue:9`, `ColumnsBlock.vue:9`, `CookieBanner.vue:22`, `InfoDialog.vue:48` | `v-html` выводит HTML из CMS (в комментариях «trusted»), санитайзера нет. CMS (`/cms`) на том же origin, что публичный сайт: скрипт, внедрённый редактором с правом `pages`/`settings`, выполняется в сессии любого, кто откроет страницу, в том числе админа, и делает запросы к `/api/cms/*` с его cookie (SameSite=Strict не мешает: запросы идут со своей же страницы). Итог: эскалация редактор → админ. Подтверждено по коду, в браузере не воспроизводилось. | В CMS в блок «Текст» вставить `<img src=x onerror="fetch('/api/cms/...')">`, открыть страницу под другим пользователем. | Санитизировать на сервере при сохранении и/или на клиенте (DOMPurify, белый список тегов); добавить CSP (см. M-1); по возможности вынести CMS на отдельный origin. |
| H-2 | `backend/package.json`, `frontend/package.json` | `npm audit`, prod-зависимости: backend 11 уязвимостей (1 critical, остальные high/moderate): `jws` 3.2.2 (GHSA-869p-cjfg-cm3x, неверная проверка HMAC, фикс 3.2.3, тянется через `jsonwebtoken` 9.0.2); `proxy-addr` 2.0.7 (GHSA-jqcg-44mw-7w3h, подмена IP через IPv4-mapped IPv6) и `express` 4.21.2 (≤4.22.2: body-parser DoS, path-to-regexp ReDoS, qs DoS); `nodemailer` 6.10.1 (много high, фикс 10.3.1, мажорный); `mysql2` (downgrade `clear_password`, zlib); `mariadb` ^3.4.4 (множество SQL-инъекций коннектора; в коде не используется? — проверить и убрать); `zod` 3.25.76 (память, фикс 4.6.7); `lodash`. Frontend prod-дерево 19: `axios` (много high), `@vue/server-renderer` (XSS, vue ≤3.5.41), `js-cookie`, `unhead`, `vite`, `postcss`, `rollup`, `nanoid`. | `cd backend && npm audit --omit=dev`; `cd frontend && npm audit --omit=dev`. | Обновить `jsonwebtoken`/`jws`, `express`, `nodemailer`, `mysql2`, `zod`, `axios`, `vue`; лишние (`mariadb`) удалить; повторить аудит. Подмену IP (`proxy-addr`) частично гасит корректный nginx (см. M-2). |
| H-3 | `backend/src/db/seeds/01_dev_data.ts:16` | Dev-seed создаёт admin/manager/senior с паролем `dev-password-1`. Если seed запустят на боевой БД — известный пароль администратора. | `npx knex seed:run` на любой БД. | Запретить seed при `NODE_ENV=production`; генерировать пароль случайно или брать из env. Проверить, что на бою пароли заменены. |

### Средне

| # | Где | Описание | Как воспроизвести | Как исправить |
|---|---|---|---|---|
| M-1 | `backend/src/app.ts:14-18`; `frontend/index.html` | Нет security-заголовков: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`; `X-Powered-By: Express` включён. Усиливает H-1 и вопрос полиглотов (L-3). | `curl -sI http://localhost:<port>/api/...`. | `helmet` в backend и/или заголовки в nginx; `app.disable('x-powered-by')`; CSP без `unsafe-inline` для скриптов. Конфиг nginx в репозитории не описан — не проверялось. |
| M-2 | `backend/src/routes/cms/auth.ts:16,31,36,46`; `middleware/rateLimit.ts:23`; `app.ts:14` | Лимит входа — ключ `логин|ip`, 5 попыток/15 мин: перебор разных логинов с одного IP не ограничен (8 разных логинов → все 401); счётчики в `Map` без очистки (рост памяти); при прямом доступе к backend `X-Forwarded-For` подменяется (`trust proxy 1`), лимит обходится. Остальные лимиты — тоже in-memory по `req.ip`, сбрасываются при рестарте. | 8 запросов `POST /api/cms/auth/login` с разными логинами → 401 без 429. | Добавить общий лимит по IP; чистить `Map` по таймеру; закрыть backend от прямого доступа (слушать только localhost/сокет), nginx должен перезаписывать `X-Forwarded-For`. |
| M-3 | `backend/src/middleware/cmsAuth.ts:13,41`; `routes/cms/auth.ts` | Токен CMS не отзывается: после `logout` тот же токен остаётся рабочим до 12 ч (replay → 200); смена пароля не обрывает сессии. | Войти, сохранить cookie, выйти, повторить запрос со старой cookie → 200. | Хранить версию сессии/`token_version` у пользователя и проверять в `requireAuth`; увеличивать при выходе и смене пароля; сократить срок. |
| M-4 | `backend/src/middleware/cmsAuth.ts:34,43`; `services/payment/index.ts:38`; `stub.ts:31` | Защита боевого режима держится только на `NODE_ENV=production`: если забыть, включаются заглушка оплаты и cookie без `Secure`. Проверки при старте нет; на `JWT_SECRET` не наложено требований к длине. | Запуск без `NODE_ENV` → заглушка оплаты доступна, cookie без Secure. | При старте падать, если `NODE_ENV!=production` и заданы боевые признаки; требовать `JWT_SECRET` ≥ 32 символов; явный `COOKIE_SECURE`. |
| M-5 | `backend/src/routes/shop.ts:76,92`; `services/cart.ts:101` | Email покупателя не подтверждается: заказ с чужим адресом отправляет письмо-подтверждение этому адресу (спам-вектор); гостевые `client`-строки создаются на каждый новый токен без ограничения объёма. Лимит заказов 10/10 мин по IP (обходится, см. M-2). | `POST` заказа с чужим email. | Лимит по email, подтверждение адреса, чистка старых гостевых клиентов. |
| M-6 | `backend/src/routes/cms/uploads.ts:50` | JPEG-полиглот с HTML-вставкой принимается (201) и отдаётся как `image/jpeg` без `X-Content-Type-Options: nosniff`; при старых браузерах/прокси возможна интерпретация как HTML. Тип файла определяется по сигнатуре, но содержимое не перекодируется. | Загрузить JPEG с HTML в хвосте, открыть `/uploads/<hex>.jpg`. | `nosniff` (см. M-1); перекодировать через `sharp` (отбрасывает хвост); отдавать `/uploads` с отдельного домена. |
| M-7 | `frontend/src/**` (CMS) | Компоненты CMS-интерфейса построчно не читались; `axios` с известными уязвимостями (H-2). | — | Отдельный проход по `frontend/src/cms`. |

### Низко

| # | Где | Описание | Как исправить |
|---|---|---|---|
| L-1 | `backend/src/utils/password.ts:8` | scrypt N=16384 — ниже рекомендации OWASP (2^17). | Поднять N до 2^17 с перехешированием при входе. |
| L-2 | `backend/src/routes/cms/tables.ts:143` | Минимальная длина пароля 8, без проверки сложности. | Минимум 12; список частых паролей. |
| L-3 | `backend/src/routes/cms/tables.ts:46` | `photoName` (`^[A-Za-z0-9._-]+$`) пропускает `..` и `.` (подтверждено: 201). Обход каталога в раздаче `/uploads` не воспроизводится (404), но значение некорректно. | Запретить имена из одних точек; проверять существование файла. |
| L-4 | `backend/src/routes/cms/tables.ts` (`og_image`) | Свободная строка до 255 символов, без проверки формата (путь/URL). | Проверять схему `https` или относительный путь. |
| L-5 | настройка `delivery.tracking_url`, `services/mail.ts` | `href` ссылки в письме берётся из настройки без проверки схемы (правит только админ). | Разрешать только `http(s)`. |
| L-6 | `backend/src/routes/shop.ts` (retryPayment) | В production повторная оплата для stub создаёт ref (notify всё равно отвечает 403). | Проверять `assertPaymentAvailable()` и на этом пути. |
| L-7 | `backend/src/app.ts:15` | CORS: единственный origin из `FRONTEND_URL` с `credentials` — норм, но значение по умолчанию `http://localhost:3000` попадёт в бой при пустой переменной. | Требовать `FRONTEND_URL` в production. |
| L-8 | `backend/src/services/publish.ts` | `spawn(PUBLISH_COMMAND, {shell:true})`: команда из env, не от пользователя — риска нет, пока env не контролируется извне. | Отметить в документации; по возможности без shell. |

## Проверено, в порядке

- Все `/api/cms/*` под `requireAuth` и правами: без cookie 401 (GET и POST), без прав 403 на tables/roles/publish/uploads.
- JWT с `alg=none` и подписью чужим ключом → 401. Роль и права перечитываются из БД на каждый запрос.
- Cookie `rc_cms`: HttpOnly, SameSite=Strict, Secure в production. CSRF-токена нет, но Strict/Lax + JSON-тела закрывают CSRF.
- Заказы и оплата: IDOR закрыт (чужой клиент и аноним → 404 на `/orders/:n` и `/orders/:n/payment`); цены, доставка и сумма считаются на сервере (400 + 250 = 650), поле `price` в корзине → 400; `quantity` -5 / 1e9 / `'x'` → 400.
- zod `.strict()` на маршрутах; SQL параметризован; сортировка/фильтры только по белому списку колонок; скрытые поля (`password`, `hashToken`, `tokenHash`, `ip_address`) не отдаются. Попытки инъекции через slug/id → 404.
- Пароли: scrypt + `timingSafeEqual`, фиктивный хеш против тайминг-атак.
- Тела > 1 МБ → 413; битый JSON → 400 без стектрейса; SVG отклоняется (400); файл > 10 МБ → 413; имена загрузок — случайный hex; обход каталога через `/uploads` → 404.
- Письма: значения экранируются (`escapeHtml`), инъекция заголовков невозможна (CRLF в имени не создаёт Bcc).
- Frontend: метки `{{company}}`/`{{email}}` экранируются, `jsonLd` экранирует `<`; секретов в сборке нет (единственная env — `VITE_API_URL`).
- Секреты: в git только `backend/.env.example`; реальные `.env` в историю не попадали; `.env`, `.env.*` в `.gitignore`.
- Заглушка оплаты в production: 503 / 403 — по коду и тестам `payment.test.ts`, сами тесты не запускались.

## Не проверено

- Боевой nginx, его заголовки и TLS (этап 12, в репозитории не описано).
- Поведение CMS и XSS в браузере (H-1 подтверждён по коду, не воспроизведён).
- Работа сервера целиком в `NODE_ENV=production`.
- SMTP-подключение и доставка писем.
- Компоненты `frontend/src/cms` построчно; e2e-сценарии.
- Корневой `package.json`: `npm audit` показал 17 уязвимостей (1 critical), состав не разбирался.
