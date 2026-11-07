# Ревизия готовности к автодокументации

Состояние: ветка `dev` на коммите `78efb55`. Только отчёт, код не менялся. Цифры получены скриптом (раздел «Как считали»); оценки трудоёмкости — экспертные, помечены.

## Итог

- Комментарии есть, но тонкие: у 30 % экспортов (140 из 467) есть JSDoc, почти всегда одна строка без `@param`/`@returns`. `@param` встречается 4 раза, `@returns` — 0.
- **Нет вообще**: JSDoc у Vue-компонентов (36 шт., 39 props, 6 событий, 3 слота — 0 описаний), у сторов pinia, у типов (7 из 51 в рабочем коде), у маршрутов API (3 из 38).
- Генерации мешает мало: `any` — 21 вхождение в 13 файлах, `export default` — только в knex-файлах и jest-хуках. Код в основном уже на строгом TypeScript, props и emits типизированы типами.
- **Мёртвый для сайта слой**: `models/`, `repositories/`, `types/` (49 файлов, ~1950 строк, 186 экспортов) не импортируются рабочим кодом, только тестом `repositories.test.ts`. Решение по ним нужно до начала работ (см. вопросы).
- API сейчас описан вручную в `docs/API.md` (237 строк, 37 эндпоинтов, совпадает с кодом, кроме `GET /api/health`). Из zod автоматически получится только часть: схемы тел запросов (9 эндпоинтов из 38), схем ответов в коде нет.
- Заготовки инструментов сломаны: `npm run docs` в backend ссылается на пакеты, которых нет в `package.json`; сайдбар VitePress во frontend ведёт на страницы, которых нет.
- Рекомендация: TypeDoc (оба пакета) + vue-docgen-cli (компоненты) + `@asteasolutions/zod-to-openapi` (API) + линтер `eslint-plugin-jsdoc`. Объём (оценка): ~16–22 ч на комментарии и ~15–24 ч на инструменты, устранение помех и OpenAPI, всего примерно 31–46 ч.

## Как считали

Скрипт `audit.js` (Node, ~200 строк): TypeScript Compiler API (`typescript` из `backend/node_modules`) разбирает каждый `.ts`/`.mjs`; для `.vue` блоки `<script>` и `<script setup>` достаёт `@vue/compiler-sfc`, шаблон — регулярными выражениями (слоты, HTML-комментарии).

- Охват: `backend/src`, `frontend/src`, `frontend/scripts`, `frontend/build`, `knexfile.ts` (корень и backend). Исключены `__tests__`, `*.test.ts`, `*.d.ts`, `node_modules`. Итого 165 файлов, 10 775 строк.
- «Экспорт» = экспортируемые функции, классы и их публичные методы, интерфейсы, типы, enum, константы, сторы `defineStore`, `export default`. Реэкспорты `export { … }` не считаются.
- «С JSDoc» = у узла есть блок `/** … */` (`node.jsDoc`). Отдельно считался «любой комментарий» (в том числе `//`): разница с JSDoc 1–3 экспорта, поэтому ниже везде JSDoc.
- Маршруты = вызовы `get/post/put/patch/delete` на `*Router`/`router`/`app` со строковым путём. Три из 41 найденных — это навешивание лимитов в `routes/index.ts` (не обработчики), поэтому обработчиков 38.
- Props/emits: `defineProps<…>()`, `defineEmits<…>()`, `withDefaults`; описанием считается JSDoc на члене типа.
- Язык: комментарий «русский», если есть кириллица; иначе «английский»; «смешанный» — кириллица плюс английская фраза из двух слов и более.
- `@param`, не совпадающий с реальными параметрами, и ссылки в комментариях на несуществующие файлы (`docs|backend|frontend|e2e/….md|ts|vue`) проверялись скриптом.
- Скрипты и сырые результаты (`out.json`, `agg.txt`) лежат вне репозитория: `/home/ilia/.config/Claude/side-session-notes/local_58ebba47-6c07-4da9-a129-bb63f8ecf839/autodoc-audit/`.
- Не проверялось запуском: `npm run docs`, TypeDoc, vue-docgen (в рабочей копии нет `node_modules`, инструменты не ставились). Всё, что про их поведение, помечено «не проверено».

## 1. Покрытие

### Сводка по слоям

| Слой | Файлов | Экспортов | С JSDoc | Доля |
|---|---|---|---|---|
| backend, рабочий код (`app`, `index`, `db/index`, `middleware`, `routes`, `services`, `utils`, `scripts`) | 33 | 123 | 45 | 37 % |
| backend `models/` | 16 | 57 | 50 | 88 % |
| backend `repositories/` | 16 | 106 | 3 | 3 % |
| backend `types/` | 17 | 23 | 0 | 0 % |
| backend `testing/` | 5 | 16 | 4 | 25 % |
| backend миграции, сиды, `knexfile` (корень и backend) | 17 | 31 | 2 | 6 % |
| frontend `.ts` | 23 | 107 | 34 | 32 % |
| frontend `scripts` + `build` | 2 | 4 | 2 | 50 % |
| frontend `.vue` (скрипт-блоки) | 36 | 0 | — | — |
| **Всего** | **165** | **467** | **140** | **30 %** |

Рабочий код сайта (без `models`, `repositories`, `types`, `testing`, миграций): 234 экспорта, 81 с JSDoc — **35 %**. Деление по видам для него:

| Вид | С JSDoc / всего | Доля |
|---|---|---|
| функции, классы, методы | 63 / 133 | 47 % |
| типы и интерфейсы | 7 / 51 | 14 % |
| константы | 11 / 47 | 23 % |
| сторы pinia (`defineStore`) | 0 / 3 | 0 % |

(Сумма видов: 63 + 7 + 11 + 0 = 81 из 133 + 51 + 47 + 3 = 234. Константы включают `frontend/scripts` и `frontend/build`.)

### Маршруты API

38 обработчиков, с комментарием 3 (8 %): `routes/shop.ts` 1 из 11, `routes/cms/tables.ts` 2 из 8; `public.ts` (9), `cms/auth.ts` (3), `cms/publish.ts` (3), `cms/roles.ts` (2), `cms/uploads.ts` (1), `index.ts` (`/health`) — 0. Комментарий на уровне файла (`@module`) есть у всех файлов маршрутов, так что файл понятен целиком, отдельный эндпоинт — нет.

### По папкам

Колонки: файлов; экспортов; из них с JSDoc; файлов без единого комментария.

| Папка | Файлов | Экспортов | JSDoc | Без комментариев |
|---|---|---|---|---|
| backend/src (app, index) | 2 | 1 | 0 | 0 |
| backend/src/db | 2 | 6 | 4 | 0 |
| backend/src/db/migrations | 14 | 28 | 2 | 0 |
| backend/src/db/seeds | 1 | 1 | 0 | 0 |
| backend/src/middleware | 3 | 16 | 6 | 0 |
| backend/src/models | 16 | 57 | 50 | 0 |
| backend/src/repositories | 16 | 106 | 3 | **15** |
| backend/src/routes | 3 | 3 | 0 | 0 |
| backend/src/routes/cms | 5 | 11 | 1 | 0 |
| backend/src/scripts | 1 | 0 | — | 0 |
| backend/src/services | 7 | 62 | 27 | 0 |
| backend/src/services/payment | 3 | 10 | 2 | 0 |
| backend/src/testing | 5 | 16 | 4 | 2 |
| backend/src/types | 17 | 23 | 0 | **17** |
| backend/src/utils | 7 | 14 | 5 | 0 |
| frontend/build | 1 | 4 | 2 | 0 |
| frontend/scripts | 1 | 0 | — | 0 |
| frontend/src (App, main, entry-*) | 4 | 2 | 1 | 0 |
| frontend/src/cms | 5 | 51 | 15 | 0 |
| frontend/src/data | 5 | 26 | 6 | 0 |
| frontend/src/router | 1 | 1 | 0 | 0 |
| frontend/src/seo | 2 | 9 | 6 | 0 |
| frontend/src/services | 3 | 14 | 6 | 0 |
| frontend/src/store | 4 | 4 | 0 | 1 |
| frontend `.vue`, все папки | 36 | 0 | 0 | **22** |

### Vue-компоненты (36, все `<script setup lang="ts">`)

| Папка | Компонентов | Props | Events | Слотов | С любым комментарием |
|---|---|---|---|---|---|
| cms/components | 13 | 17 | 5 | 0 | 3 |
| components/blocks | 6 | 8 | 0 | 0 | 5 |
| components/floating | 2 | 0 | 0 | 0 | 0 |
| components/layout | 6 | 13 | 1 | 2 | 2 |
| components/utils | 1 | 0 | 0 | 1 | 0 |
| pages/dynamic | 6 | 0 | 0 | 0 | 2 |
| pages/static | 1 | 1 | 0 | 0 | 1 |
| App.vue | 1 | 0 | 0 | 0 | 1 |
| **Всего** | **36** | **39** | **6** | **3** | **14** |

- Props: 17 компонентов, все через тип-аргумент `defineProps<{…}>()`; описаний 0 из 39.
- Events: 4 компонента, все через типизированную сигнатуру; описаний 0 из 6.
- Слоты: 3 (`<slot/>` без имён), `defineSlots` и `defineExpose` нигде не используются.
- Описание компонента (блок `/** */` в начале скрипта): 0. HTML-комментарий в шаблоне: 2 компонента.
- Без единого комментария 22 компонента из 36.

### Сторы pinia (3)

| Стор | JSDoc на стор | Внутренние члены | С JSDoc |
|---|---|---|---|
| `store/app.ts` (`useAppStore`) | нет | 0 | — |
| `store/cart.ts` (`useCartStore`) | нет (есть заголовок файла) | 15 (6 state, 1 getter, 8 actions) | 1 |
| `store/cms.ts` (`useCmsStore`) | нет (есть заголовок файла) | 10 (3 state, 2 getters, 5 actions) | 1 |

### Файлы без документации вообще (нет ни одного комментария) — 58 из 165

- backend, `repositories/` — 15 из 16 (полный список — в `agg.txt`, раздел «ФАЙЛЫ БЕЗ КОММЕНТАРИЕВ»).
- backend, `types/` — 17 (все).
- backend, `testing/globalSetup.ts`, `testing/globalTeardown.ts`.
- frontend `.ts`: `store/app.ts`.
- корень: `knexfile.ts`.
- frontend `.vue` — 22: `cms/components/` Cell, ChildTable, Details, LoginForm, PhotoField, PublishSection, RecordForm, RolesSection, SeoPreview, SettingsSection; `components/blocks/PhotoItem`; `components/floating/` CartBadge, CookieBanner; `components/layout/` Header, InfoDialog, ShopPage, StaticPage; `components/utils/ClientOnly`; `pages/dynamic/` AppShell, CMS, Cart, Order.

В рабочем коде backend (33 файла) файлов без комментариев нет: у каждого есть хотя бы заголовок `@module`. Но в 24 из них есть экспорты без JSDoc.

## 2. Качество существующих комментариев

- **Язык.** Из 355 комментариев в `.ts` 15 (4 %) русские, остальные английские. В backend русских 0, во frontend `.ts` 5 (из них `cms/registry.ts` 4, `data/content.ts` 1), в миграциях 10 из 59, из них 9 смешанные. Документация проекта (`docs/*.md`) и тексты интерфейса — русские. То есть код и сгенерированная документация будут английскими, а ручные документы — русскими. Решение по языку — вопрос 1.
- **Формат.** Заголовок файла — `/** … @module путь */`: 41 тег `@module` в 31 файле (23 в backend). Остальные JSDoc — однострочные или короткие абзацы по существу («зачем», а не «что»), без `@param`/`@returns`. Тегов `@example`, `@throws`, `@see` нет.
- **Устаревшие/расходящиеся.** Автоматически не найдено: ни одного `@param`, не совпадающего с сигнатурой, ни одной ссылки на несуществующий файл. Вручную (выборочно, не полная вычитка 355 комментариев):
  - `frontend/src/data/fixtures.ts:76` — «Numbers from the old IndexSeo.vue, rendering is stage 9»: файла `IndexSeo.vue` в проекте нет, этап 9 выполнен — устарел.
  - `frontend/src/data/types.ts:57` — «The order flow (stage 7) always asks the backend for the price»: верно, но привязка к «этапу» бесполезна для читателя документации. Всего ссылок на «Stage N» ~10 (миграции и несколько файлов), они описывают историю, а не поведение.
  - `models/Item.ts` и др.: комментарии в моделях общие («Item validation and business logic for Knex Item model»), модель не используется сайтом, проверять их на соответствие нечему (классы с `private`-полями).
- **Пустые описания.** Хорошо: заголовки файлов в `services/` и `routes/` объясняют границы ответственности и ссылаются на `docs/API.md`. Плохо: в `middleware/cmsAuth.ts` 9 экспортов, 1 с JSDoc, в `utils/visitor.ts` 7 экспортов, 0, в `services/cart.ts` 16, 4.

## 3. Что мешает генерации

| Помеха | Где | Влияние |
|---|---|---|
| `any` — 21 вхождение в 13 файлах | backend: `routes/cms/tables.ts` (`Row = Record<string, any>`, 2), `services/catalog.ts`, `services/payments.ts`, `models/BaseSettings.ts`, `repositories/BaseSettingsRepository.ts`; frontend: `cms/api.ts`, `cms/logic.ts` (2), `data/api.ts` (3), `services/counters.ts`, `cms/components/` FieldInput (3), RecordForm (2), TableSection (2), SeoPreview, SettingsSection (`as any`) | Типы в документации превращаются в `any`/`Record<string, any>`; для OpenAPI из `Row` схему не получить |
| Неэкспортированные типы — 12 (backend 3, frontend `.ts` 4, внутри Vue 5) | в основном формы ответов и аргументы | TypeDoc предупреждает «referenced but not included» (при `validation.notExported`), в документации ссылка ведёт в пустоту. Исправление — добавить `export` |
| `export default` — 4 | `knexfile.ts` (2), `testing/globalSetup.ts`, `globalTeardown.ts` | Мешает мало (конфиги и jest-хуки). Исключить из документации |
| Формы ответов не типизированы | `res.json({ … })` по месту во многих обработчиках | Нет единого типа ответа — OpenAPI придётся описывать отдельно |
| Setup-сторы pinia | все три стора — функция в `defineStore('x', () => {…})` | TypeDoc покажет только константу `useCartStore` с выведенным типом; внутренние `ref`/функции с комментариями не попадут (не проверено). Нужен явный интерфейс стора или ручное описание в JSDoc стора |
| `.vue` файлы | 36 | TypeDoc их не читает вообще; нужен vue-docgen |
| Параллельные деревья | корневые `knexfile.ts`/`package.json` и `backend/…` отличаются (`diff` расходится) | Риск попасть в документацию дважды; в `entryPoints` указывать только `backend/src` |
| `any`-заглушка `types/vitejs-plugin-vue.d.ts` | frontend | Не мешает, исключить `*.d.ts` |
| Пустая инфраструктура | backend `jsdoc.json`: плагины `jsdoc-tsimport-plugin`, `better-docs/typescript` не в `package.json` (в `node_modules` backend есть только `jsdoc`); `destination: ./docs/`. Frontend `docs:*` → VitePress, но в `frontend/docs/` только `index.md`, сайдбар ссылается на `components/`, `pages/`, `getting-started`, `project-structure` | Не проверено запуском. Скорее всего, `npm run docs` не работает. Заготовки лучше заменить, а не чинить: JSDoc не читает TypeScript-синтаксис без плагинов |
| Миграции | 14 файлов, у каждого заголовок `Stage N: …`, но экспорты `up`/`down` без описаний | Для документации не нужны; исключить, оставить заголовок |

В пользу генерации: `strict: true` в обоих `tsconfig`, все props/emits типизированы типом, `lang="ts"` везде, нет `// @ts-ignore`/`@ts-expect-error`, нет `as any` (кроме одного в шаблоне `SettingsSection.vue`; `any` из шаблонов в 21 вхождение скрипта не входит), экспорты именованные, комментарии в формате JSDoc, а не произвольные блоки.

## 4. API: как описан сейчас и можно ли получать из zod

**Сейчас.** `docs/API.md`: общие правила (формат ошибок, cookie, деньги, мягкое удаление), по каждому эндпоинту — заголовок, пример JSON, замечания. Сверка списка путей с кодом: 38 обработчиков в коде, 37 в файле; в файле нет `GET /api/health`; имя параметра в документе `:item_id`, в коде `:itemId` (мелочь). Других описаний API нет (поиск `openapi|swagger` по `docs/`, `README.md`, `backend/src` — пусто). В заголовках файлов маршрутов есть ссылка на `docs/API.md`, значит ручной документ остаётся источником правды, и синхронность держится дисциплиной, не проверкой.

**zod в коде.** Подключён (`zod ^3.22.4`), используется в 6 файлах (включая `middleware/error.ts`, обработку `ZodError`), 9 вызовов `z.object(...)` плюс реестр `routes/cms/tables.ts`:
- `shop.ts`: добавление в корзину, смена количества, `orderSchema` (заказ);
- `cms/auth.ts`: `loginSchema`; `cms/roles.ts`: права роли; `payment/stub.ts`: уведомление заглушки;
- `cms/tables.ts`: реестр `Spec.fields: ZodRawShape` для каждой таблицы CMS, из него собираются `create`/`update`-схемы — самый ценный источник: одна схема на таблицу, общие обработчики `/cms/tables/:name`.

Что получится автоматически: тела запросов для 9 из 38 эндпоинтов (cart ×2, orders, login, roles, send-mail, уведомление заглушки оплаты, общие create/update для таблиц CMS), включая ограничения (длины, enum, `strict`).
Чего не получится без доработки:
- параметры пути и query (`req.params`, `req.query` разбираются вручную; `itemId`, `city`, `page/limit/sort/q` не в zod);
- **ответы**: схем нет, `res.json({…})` по месту; пример `CartView` — интерфейс, а не схема;
- коды ошибок, cookie, права CMS (`requirePermission`) — не в схемах;
- маршруты нельзя вывести из zod: путь/метод живёт в Express. Нужна регистрация путей отдельно (реестр OpenAPI).

Вывод: «автоматически из zod» верно для схем запросов. Полноценный OpenAPI потребует (а) вынести схемы в общие модули, (б) описать ответы zod-схемами (заодно они проверят тесты `supertest`), (в) зарегистрировать 38 путей. Реальная автогенерация из кода без ручной регистрации невозможна при текущей архитектуре.

## 5. Рекомендация

### Инструменты

| Задача | Инструмент | Зачем |
|---|---|---|
| TS-код backend и frontend | **TypeDoc** (+ `typedoc-plugin-markdown`, если результат класть в VitePress/`docs/`) | Читает TSDoc/JSDoc и типы напрямую из TS, умеет проверку покрытия (`validation.notDocumented`, `requiredToBeDocumented`) |
| Vue-компоненты | **vue-docgen-cli** (`vue-docgen-api`) | Props/emits/slots из `<script setup lang="ts">`; описание компонента и членов берёт из JSDoc. Поддержка `defineProps<Imported>()` с типом из другого файла — ограничена (не проверено): типы props лучше объявлять в том же файле |
| API | **`@asteasolutions/zod-to-openapi`** (совместим с zod 3; версию уточнить при установке) + `openapi.json` для Redoc/Scalar | Схемы запросов — из существующего zod, ответы — новые zod-схемы, пути регистрируются в `backend/src/openapi.ts` |
| Сторы | TypeDoc + явные интерфейсы сторов, либо JSDoc на `defineStore` | См. «Помехи» |
| Контроль | **eslint-plugin-jsdoc** (`require-jsdoc` с `publicOnly`, `check-param-names`) в ESLint обоих пакетов (конфиги нужно создать, см. ниже); `typedoc --treatWarningsAsErrors` | Не даёт покрытию упасть и ловит расхождение `@param` с сигнатурой |
| Публикация | VitePress в `frontend/docs/` (уже есть, но пуст) | Одна точка: `docs/api` (OpenAPI), `docs/backend` и `docs/frontend` (TypeDoc), `docs/components` (docgen) |

Не рекомендуется: оставлять `jsdoc` + `better-docs` (без TS-плагинов TS-синтаксис не читается), swagger-jsdoc (комментарии `@openapi` дублируют схемы zod и расходятся с кодом).

### Конфиги, которые понадобятся

- `backend/typedoc.json`: `entryPoints: ["src"]`, `entryPointStrategy: "expand"`, `exclude: ["**/__tests__/**", "**/testing/**", "**/db/migrations/**", "**/db/seeds/**", "**/*.test.ts"]`, `tsconfig: "tsconfig.json"`, `out: "../docs/generated/backend"`, `validation: { notExported: true, notDocumented: true }`, `excludeNotDocumented` выключить на время работ.
- `frontend/typedoc.json`: то же для `src/**/*.ts` (`.vue` TypeDoc не видит), исключить `*.d.ts` и `__tests__`.
- `frontend/docgen.config.js`: `componentsRoot: "src"`, `components: "**/*.vue"`, `outDir: "docs/components"`, шаблон на русском/английском — по решению по языку.
- `backend/src/openapi.ts` (регистр + генератор) и скрипт `backend/scripts/gen-openapi.ts`, выход — `docs/generated/openapi.json`.
- Скрипты `package.json`: `docs:ts`, `docs:vue`, `docs:api`, общий `docs:build`; удалить `docs` с jsdoc и устаревший `jsdoc.json`.
- ESLint-конфиг с `plugin:jsdoc/recommended-typescript`: конфигурационных файлов ESLint в репозитории не найдено (во frontend есть только скрипт `lint`, в backend нет вовсе), так что конфиг создаётся в обоих пакетах.
- Тест-контракт: проверка, что каждый маршрут из `router` есть в OpenAPI (список маршрутов берётся из `router.stack`), чтобы пропуск ловился в CI, а не на глаз.

### Объём работ

Базовая норма (допущение): 2–4 мин на функцию/тип, 5–8 мин на эндпоинт (параметры, ответ, ошибки), 8–12 мин на компонент (описание + props/events/slots). Это оценка, а не замер.

| Работа | Единиц | Файлов | Часов |
|---|---|---|---|
| Backend, рабочий код: 78 экспортов без JSDoc | 78 | 24 | 4–5 |
| Backend, маршруты: комментарий + регистрация в OpenAPI (описание путей; файлы те же 24) | 38 | — | 3–4 |
| Frontend `.ts`: 73 экспорта | 73 | 19 | 3–4 |
| Vue-компоненты: описание + 39 props + 6 events + 3 slots | 36 | 36 | 5–7 |
| Сторы: стор и 25 внутренних членов | 3 | 3 | 1–1,5 |
| Итого комментарии | | **~82 файла** | **~16–22** |
| Если оставить `models/repositories/types`: ещё 133 экспорта, шаблонные | 133 | 49 | 4–6 |
| Устранить помехи: 21 `any`, 12 `export`, интерфейсы сторов | | ~25 | 2–3 |
| Настройка TypeDoc, docgen, VitePress, скрипты, ESLint, CI-проверка | | ~10 новых | 5–7 |
| OpenAPI: вынос zod-схем, схемы ответов, реестр путей, контракт-тест | 38 путей | ~12 | 8–14 |

Итого без `models/repositories/types`: **~31–46 ч**; с ними **~35–52 ч** (оценка).

### Порядок работ

1. Решить вопросы 1–3 ниже. 0,5 ч.
2. Прототип на 3 файлах: TypeDoc backend, TypeDoc frontend, vue-docgen на `ColorsBlock.vue`, VitePress. Проверить непроверенное (setup-сторы, импортированные типы props, `defineProps`). 2–3 ч.
3. Убрать помехи (`any`, `export`, интерфейсы сторов), удалить сломанные `jsdoc.json` и `docs:*`-заглушки. 2–3 ч.
4. Проставить комментарии по убыванию пользы: `services` + `routes` → `middleware`/`utils` → frontend `data`/`cms`/`services`/`seo` → сторы → компоненты. Включать `requiredToBeDocumented` по папкам по мере готовности.
5. OpenAPI: сначала общие схемы и `shop`/`public` (каталог, корзина, заказ — то, что видит покупатель), затем CMS (через реестр таблиц). Контракт-тест на полноту.
6. CI-проверка (`docs:build` без предупреждений, ESLint-правило) и ссылка `docs/API.md` → сгенерированный файл; ручной `API.md` оставить как руководство по общим правилам (cookie, деньги, ошибки), а перечень эндпоинтов получать генерацией.

### Вопросы заказчику / координатору

1. Язык комментариев и сгенерированной документации: оставить английский (как сейчас, 96 % комментариев) и переводить только вводный текст на русский, или писать русским? Предложение: английский в коде, русские вводные документы и описания `docs/`. Обсудить, кто читает.
2. `models/`, `repositories/`, `types/` (49 файлов) не используются сайтом, только тестом `repositories.test.ts`. Удалить вместе с тестом, оставить без документации (исключить из TypeDoc) или документировать? Предложение: исключить из TypeDoc, судьбу кода решить отдельно.
3. Нужен ли публичный OpenAPI (интерактивная страница `/docs`) или достаточно файла в `docs/`? Предложение: файл + статическая страница в VitePress, без отдельного маршрута на сервере.

## 6. Примеры комментариев

Формат: TSDoc (совместим с TypeDoc и vue-docgen), без `{type}` в `@param` (типы берутся из TS), первое предложение — что делает и зачем, далее только то, чего нет в сигнатуре: ограничения, побочные эффекты, ошибки. Язык — по решению вопроса 1 (примеры на английском, как в коде сейчас).

### Функция

```ts
/**
 * Adds `quantity` pieces of an item to the visitor's cart and returns the whole cart.
 *
 * Creates the visitor token on the first call (anonymous cart, see docs/API.md, "Visitor and cookie").
 * The price is never taken from the caller: it is the current `price` row of the item.
 *
 * @param token - Value of the `rc_client` cookie, `null` for a new visitor.
 * @param itemId - `item.id` (a colour pair of a product); must not be soft-deleted.
 * @param quantity - Pieces to add, 1..{@link MAX_QUANTITY}; the sum in the cart is capped at the same value.
 * @returns The cart view and `issued`, a new token to set as cookie (`undefined` if the visitor already had one).
 * @throws {@link ApiError} 404 when the item does not exist or has no current price.
 * @example
 * const { view } = await addItem(readToken(req), 12, 2)
 */
export async function addItem(token: string | null, itemId: number, quantity: number) { … }
```

### Маршрут

Описание эндпоинта живёт в реестре OpenAPI (источник для `openapi.json`), в обработчике остаётся короткая отсылка. Тип запроса берётся из той же zod-схемы, что используется при разборе.

```ts
// backend/src/schemas/cart.ts
export const AddCartItemBody = z.object({
  item_id: z.number().int().positive().describe('item.id, a colour pair'),
  quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1)
}).strict().openapi('AddCartItemBody')

// backend/src/openapi.ts
registry.registerPath({
  method: 'post', path: '/api/cart/items', tags: ['Cart'],
  summary: 'Add an item to the cart',
  description: 'Creates the anonymous visitor on the first call and sets `rc_client` (HttpOnly) and `rc_cart_count`. Price is calculated on the server.',
  request: { body: { content: { 'application/json': { schema: AddCartItemBody } } } },
  responses: {
    200: { description: 'Updated cart', content: { 'application/json': { schema: CartView } } },
    400: { description: 'Validation Error', content: { 'application/json': { schema: ValidationError } } },
    404: { description: 'Item not found', content: { 'application/json': { schema: ErrorBody } } },
    429: { description: 'Too many requests (cart write limit)' }
  }
})

// backend/src/routes/shop.ts
/** Handler of `POST /api/cart/items`; the contract is in `openapi.ts`. */
shopRouter.post('/cart/items', wrap(async (req, res) => { … }))
```

### Компонент

Описание компонента — блок `/** */` в начале `<script setup>`; props — интерфейс в том же файле (так vue-docgen разберёт типы надёжнее); события — сигнатуры с комментарием; слот — комментарий `@slot` в шаблоне. Пример по `cms/components/Cell.vue` и `RecordForm.vue`:

```vue
<script setup lang="ts">
/**
 * One cell of the CMS list: formats the value by the column kind (money, date, reference, badge, text).
 * Reference labels are loaded lazily through `loadRef` on mount.
 */
interface Props {
  /** Column description from the table registry; `column.kind` decides the formatting. */
  column: Column
  /** Record the cell belongs to; the shown value is `row[column.key]`. */
  row: Row
}
const props = defineProps<Props>()
</script>
```

```ts
// RecordForm.vue
const emit = defineEmits<{
  /** The record is saved; carries the row returned by the API. */
  (e: 'saved', row: Row): void
  /** The user closed the form without saving. */
  (e: 'cancel'): void
  /** Current field values, emitted on every change (used by the SEO preview). */
  (e: 'values', v: Record<string, unknown>): void
}>()
```

```vue
<!-- ClientOnly.vue -->
<template>
  <!-- @slot Content rendered only in the browser, never during the static build. -->
  <slot />
</template>
```

Где vue-docgen ищет описание компонента (начало `<script setup>` или другое место) и как читает комментарии событий, нужно проверить на прототипе (шаг 2): не проверено.
