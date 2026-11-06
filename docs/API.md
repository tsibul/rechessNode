# API reChess

Этап 4. Контракт для публичных страниц (этапы 6–7), CMS (этап 5) и сборки. Реализация: `backend/src/app.ts`, `backend/src/routes/`. Версия 1; изменения контракта вносятся сюда же.

## Общее

- База: `/api`. JSON в запросах и ответах (`Content-Type: application/json`), кроме загрузки файла.
- Ошибка: `{ "error": "текст" }`, для проверки полей `{ "error": "Validation Error", "details": [{ "path": ["поле"], "message": "…" }] }`. Коды: 400 проверка, 401 нет входа, 403 нет права, 404, 409 конфликт, 429 лимит попыток входа, 500.
- Деньги: целые рубли.
- Мягкое удаление: записи с `deleted = 1` публично не отдаются.
- Фото: в ответах поле `photo` — имя файла. Файл отдаётся по `/uploads/<имя>`.
- Цену клиент не передаёт никогда. Цена и суммы считаются только на бэке по текущей цене товара (последняя неудалённая `price` с `price_date` не позже текущего момента).
- CORS: разрешён `FRONTEND_URL`, cookie передаются (`credentials`). С фронта запросы идут с `credentials: 'include'` (axios: `withCredentials: true`).

## Посетитель и cookie

Входа и кабинета у покупателей нет. Посетителя с корзиной опознаёт анонимный токен.

| Cookie | Кто ставит | Свойства | Смысл |
|---|---|---|---|
| `rc_client` | сервер | HttpOnly, SameSite=Lax, 1 год, Secure в production | Токен. В БД хранится только SHA-256 токена (`client.tokenHash`) |
| `rc_cart_count` | сервер | читаемая из JS, SameSite=Lax, 1 год | Число штук в корзине, для значка без запроса к бэку. Обновляется при каждом изменении корзины и заказе |

- Токен создаётся при первом добавлении в корзину (`POST /api/cart/items`). `GET`-запросы и публичные страницы клиента не создают.
- IP не сохраняется.
- Токен без записи в БД (подделка, удаление) считается отсутствующим: `GET /api/cart` вернёт пустую корзину, при добавлении выдаётся новый токен.

## Публичное

### Каталог и цена

`GET /api/products` — товары с текущей ценой и парами цветов.

```json
{ "products": [{
  "id": 1, "name": "Шахматы reChess", "description": "…",
  "price": 9900,
  "items": [{
    "id": 1, "name": "Чёрный и белый", "article": "0102",
    "main_color": { "id": 1, "name": "Чёрный", "code": "01", "hex": "1A1A1A" },
    "second_color": { "id": 2, "name": "Белый", "code": "02", "hex": "F2F2F2" },
    "photos": [{ "name": "Фото пары 1", "photo": "item-1.jpg" }]
  }]
}] }
```

`price` — `null`, если у товара нет действующей цены. `article` = `main_color.code` + `second_color.code`. Фото по `priority`, пары по `id`.

`GET /api/products/:id/price` → `{ "product_id": 1, "price": 9900 }`; 404 если товара нет или цены нет.

### Страницы, SEO, настройки (для сборки)

- `GET /api/pages` → `{ "pages": [{ "slug": "index", "name": "Главная", "seo": {…} | null }] }`.
- `GET /api/pages/:slug` → страница с блоками и SEO; 404 если нет.

```json
{ "slug": "index", "name": "Главная",
  "blocks": [{ "code": "hero", "priority": 10, "content": { "title": "…" } }],
  "seo": { "title": "…", "description": "…", "og_title": null, "og_description": null,
           "og_image": null, "robots_index": true } }
```

`content` — JSON, форма зависит от `code`. `og_*` пустые — клиент подставляет `title`, `description`.

- `GET /api/settings` → `{ "settings": { "site.url": "…", "counter.metrika": "…" } }`. Значения `number` и `boolean` приходят приведёнными (числом и булевым), пустое — `null`. Секретов в таблице нет, отдаются все неудалённые.
- `GET /api/shops` → `{ "shops": [{ "id", "name", "address", "working_hours", "phone", "web_site", "photos": [{ "name", "photo" }] }] }`.
- `GET /api/index-photos` → `{ "photos": [{ "name", "priority", "photo" }] }`.
- `GET /api/seller` → `{ "seller": { "name", "ogrn", "inn", "kpp", "address", "phone" } | null }`.
- `GET /api/site` — всё для сборки одним запросом: `{ "settings", "pages" (с блоками и seo), "products", "shops", "index_photos", "seller" }`, формы те же.

### Корзина

Корзина одна на посетителя: последняя с `ordered = NULL`.

Формат корзины во всех ответах:

```json
{ "items": [{
  "item_id": 1, "name": "Чёрный и белый", "article": "0102", "photo": "item-1.jpg",
  "quantity": 2, "price": 9900, "sum": 19800
}], "count": 2, "total": 19800 }
```

`count` — штук, `total` — итог. Пустая корзина: `{ "items": [], "count": 0, "total": 0 }`.

- `GET /api/cart` → корзина. Без cookie или с неизвестным токеном — пустая, ничего не создаётся.
- `POST /api/cart/items` `{ "item_id": 1, "quantity": 1 }` → корзина. `quantity` 1–99, по умолчанию 1. Повторное добавление суммирует количество (итог не больше 99). Первое добавление создаёт клиента, корзину, ставит cookie. Неизвестная или удалённая пара — 404.
- `PATCH /api/cart/items/:item_id` `{ "quantity": 3 }` → корзина. `quantity` 0–99, 0 удаляет строку. Строки нет — 404.
- `DELETE /api/cart/items/:item_id` → корзина. Строки нет — 404.

### Заказ

- `GET /api/checkout/prefill` → `{ "contact": { "name", "family_name", "city", "phone", "e_mail", "address_delivery", "delivery_address", "delivery_point_code" } | null }`. Данные последнего оформления этого посетителя для подстановки. Без токена — `null`.
- `POST /api/orders` — создать заказ из текущей корзины. Тело:

```json
{ "name": "Иван", "family_name": "Тестов", "city": "Москва",
  "phone": "+79990000001", "e_mail": "ivan@example.com",
  "address_delivery": true, "delivery_address": "Москва, …",
  "delivery_point_code": null, "comment": "…", "consent": true }
```

Обязательны `name`, `phone`, `e_mail`, `delivery_address`, `consent` (строго `true`). `address_delivery`: `true` — доставка до двери, `false` — пункт выдачи (тогда нужен `delivery_point_code`). Телефон нормализуется к `+7XXXXXXXXXX` (принимаются 10–11 цифр, РФ).

Сервер: считает цены и сумму из корзины (поля цены в теле игнорируются), присваивает следующий `number`, статус с наименьшим `priority`, `payment_state = not_paid`, `delivery_cost = null`, `consent_at` — сейчас, `consent_version` — настройка `legal.consent_version`. Контакты записываются в заказ снимком и в `client` для подстановки. Корзина закрывается (`ordered`). Ответ 201:

```json
{ "order": { "number": 1002, "date": "…", "sum": 19800, "delivery_cost": null,
  "state": "Новый", "payment_state": "not_paid", "delivery_reference": null,
  "name": "…", "family_name": "…", "city": "…", "phone": "…", "e_mail": "…",
  "address_delivery": true, "delivery_address": "…", "delivery_point_code": null, "comment": null,
  "items": [{ "item_id": 1, "name": "…", "article": "0102", "quantity": 2, "price": 9900, "sum": 19800 }] } }
```

Пустая корзина — 400 `Cart is empty`. Письмо подтверждения и трек — этап 8.

- `GET /api/orders/:number` → тот же `{ "order": … }`, только для заказа этого посетителя (по токену). Чужой или несуществующий — 404 (не различаются).

## CMS

Префикс `/api/cms`. Вход по логину и паролю, сессия в cookie `rc_cms` (HttpOnly, SameSite=Strict, JWT на 12 часов). Права проверяются при каждом запросе по БД: `user → role → role_permission`, поэтому смена роли и удаление пользователя действуют сразу. Коды прав: `orders`, `clients`, `carts`, `references`, `prices`, `seo`, `pages`, `settings`, `users`, `publish`.

- `POST /api/cms/login` `{ "login", "password" }` → `{ "user": { "id", "name", "login", "role": { "id", "code", "name" }, "permissions": ["orders", …] } }` и cookie. Неверная пара — 401 одним текстом для любого случая. После 5 неудач подряд для пары «логин+IP» — 429 на 15 минут.
- `POST /api/cms/logout` → 204.
- `GET /api/cms/me` → как ответ входа; 401 без сессии.

Дальше все маршруты требуют сессии (401) и права (403).

### Таблицы

Единая схема `/api/cms/tables/:name`. Список таблиц и права:

| `:name` | Право | Операции | Поля для записи |
|---|---|---|---|
| `color` | references | список, чтение, создание, правка, удаление | `name`, `code` (2 символа), `hex` (6 hex) |
| `product` | references | то же | `name`, `description` |
| `item` | references | то же | `name`, `product_id`, `main_color`, `second_color` |
| `item_photo` | references | то же | `name`, `priority`, `photo`, `item_id` |
| `index_photo` | references | то же | `name`, `priority`, `photo` |
| `shops` | references | то же | `name`, `address`, `working_hours`, `phone`, `web_site` |
| `shop_photo` | references | то же | `name`, `priority`, `photo`, `shop_id` |
| `seller` | references | то же | `name`, `ogrn`, `inn`, `kpp`, `address`, `phone` |
| `order_state` | references | то же | `name`, `priority` |
| `price` | prices | то же | `product_id`, `price` (целое ≥ 0), `price_date` |
| `seo` | seo | список, чтение, создание, правка, удаление | `page_id`, `title`, `description`, `og_title`, `og_description`, `og_image`, `robots_index` |
| `page` | pages | то же | `slug`, `name` |
| `page_block` | pages | то же | `page_id`, `code`, `priority`, `content` (любой JSON) |
| `setting` | settings | список, чтение, создание, правка, удаление | `code` (только при создании), `name`, `type` (`text`/`html`/`number`/`boolean`/`photo`), `value`, `group_name`, `priority` |
| `user` | users | то же | `name`, `login`, `password` (при создании обязателен, при правке — если меняется), `role_id` |
| `role` | users | то же | `code`, `name` |
| `client` | clients | список, чтение, правка, удаление | `name`, `family_name`, `city`, `phone`, `e_mail`, `address_delivery`, `delivery_address`, `delivery_point_code` |
| `cart` | carts | список, чтение, удаление | — |
| `order` | orders | список, чтение, правка | `order_state_id`, `delivery_reference`, `delivery_cost`, `payment_state`, `comment` |

Маршруты:

- `GET /api/cms/tables/:name?page=1&limit=50&deleted=0|1|all&sort=id&dir=asc|desc&q=текст` → `{ "rows": […], "total": N, "page": 1, "limit": 50 }`. `limit` до 200. `deleted`: по умолчанию `0` (только неудалённые). `sort` — любая колонка таблицы, `q` — поиск по текстовой колонке `name` (если есть). Фильтры по полям: `?<поле>=<значение>` для колонок таблицы (например `?page_id=3`).
- `GET /api/cms/tables/:name/:id` → `{ "row": … }`.
- `POST /api/cms/tables/:name` → 201 `{ "row": … }`.
- `PATCH /api/cms/tables/:name/:id` — частичная правка → `{ "row": … }`.
- `DELETE /api/cms/tables/:name/:id` → 204. Мягкое удаление (`deleted = 1`).
- `POST /api/cms/tables/:name/:id/restore` → `{ "row": … }`.

Правила: неизвестные поля в теле — 400. Пароль и `hashToken` в ответах не бывает. `content` у `page_block` в ответе — разобранный JSON. Нарушение внешнего ключа — 400, дубль уникального значения — 409. У `order` правка записывает `updated_by` и `last_updated`.

Особенности:

- `order`: в списке и чтении добавлены `state` (название статуса) и `items` (позиции с `name`, `article`, `quantity`, `price`). Создать и удалить заказ нельзя. Фильтр `?order_state_id=`.
- `cart`: добавлены `client` (`name`, `phone`, `e_mail`) и `items`. Фильтры: `?abandoned=1` — не оформленные, не менявшиеся дольше `?hours=24` и непустые; `?ordered=0` — не оформленные.
- `client`: токен и IP не отдаются.
- `user`: нельзя удалить или перевести в другую роль самого себя (400).
- `role`: роль с пользователями удалить нельзя (409).

### Права роли

- `GET /api/cms/roles` (право `users`) → `{ "roles": [{ "id", "code", "name", "permissions": […] }] }`.
- `PUT /api/cms/roles/:id/permissions` `{ "permissions": ["orders", …] }` (право `users`) → роль. Неизвестный код — 400. Свои права снять с роли `admin` нельзя: у `admin` всегда остаётся `users`.

### Фото

`POST /api/cms/uploads` (`multipart/form-data`, поле `file`; право — любое из `references`, `pages`, `seo`, `settings`) → 201 `{ "photo": "a1b2….jpg" }`. Только JPEG, PNG, WebP, AVIF (по содержимому, не по расширению), до 10 МБ. Имя случайное, исходное не сохраняется. Полученное имя записывается в поле `photo` нужной таблицы. Конвертация в WebP/AVIF — этап 9.

### Публикация

- `POST /api/cms/publish` (право `publish`) → 202 `{ "publication": { "id", "state": "queued", … } }`. Запускает пересборку командой из `PUBLISH_COMMAND` (окружение). Если сборка уже идёт — 409. Если команда не задана — запись завершается `failed` с пояснением в `log`.
- `GET /api/cms/publications?limit=20` (право `publish`) → `{ "publications": [{ "id", "state", "started_by", "started_at", "finished_at", "log" }] }`, новые первыми. Состояния: `queued`, `running`, `done`, `failed`.
- `GET /api/cms/publications/:id` → одна запись.

После перезапуска сервера незавершённые записи помечаются `failed`.

## Окружение

`JWT_SECRET` (обязателен для CMS), `FRONTEND_URL`, `PUBLISH_COMMAND`, `PUBLISH_CWD`, `UPLOAD_DIR` (по умолчанию `backend/uploads`), `PORT`, `NODE_ENV`, параметры БД.

## Решения этапа

1. Пароли: `scrypt` из `node:crypto` (N=16384, r=8, p=1, 64 байта, соль 16 байт), формат `scrypt$<соль hex>$<хеш hex>`, сравнение `timingSafeEqual`. Новых зависимостей нет. Формат совпадает с сидами.
2. Сессия CMS: JWT в HttpOnly cookie, права из БД на каждый запрос. `user.hashToken` не используется.
3. Токен посетителя: случайные 32 байта, в БД SHA-256. IP не пишется.
4. CMS-таблицы идут через общий реестр, а не отдельный маршрут на таблицу: новые таблицы добавляются строкой реестра.
5. Первый боевой админ: `npm run create-admin -- <login> <имя>` (пароль спрашивается, не передаётся аргументом).
6. Удалены: `/api/auth/client/token`, `/api/users`, шаблонные тесты. Фронт `clientToken.ts` и его тест (`/api/auth/client/token`) устарели: страницы переходят на `/api/cart`.
