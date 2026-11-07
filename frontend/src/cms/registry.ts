/**
 * Description of the CMS sections. One entry = one menu item. Generic sections
 * (list + form) are driven only by this data, so a new registry table of the
 * backend needs one entry here.
 * @module cms/registry
 */

/**
 * Permission codes of the CMS.
 */
export const PERMISSIONS = [
  'orders', 'clients', 'carts', 'references', 'prices', 'seo', 'pages', 'settings', 'users', 'publish'
] as const
/**
 * One of {@link PERMISSIONS}.
 */
export type Permission = (typeof PERMISSIONS)[number]

/**
 * Display names of permissions.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  orders: 'Заказы',
  clients: 'Клиенты',
  carts: 'Корзины',
  references: 'Справочники',
  prices: 'Цены',
  seo: 'SEO',
  pages: 'Страницы и блоки',
  settings: 'Настройки',
  users: 'Пользователи и роли',
  publish: 'Публикация'
}

/**
 * Input type of a form field.
 */
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'boolean' | 'hex' | 'select' | 'enum' | 'photo' | 'json' | 'password' | 'datetime'

/**
 * A field of a CMS edit form.
 */
export interface Field {
  key: string
  label: string
  type: FieldType
  required?: boolean
  /** `select`: table the id points to; the label is taken from `refLabel` (default `name`). */
  ref?: string
  refLabel?: string
  options?: { value: string; label: string }[]
  hint?: string
  /** Not sent when editing (backend does not accept it), e.g. setting code. */
  createOnly?: boolean
  /** Password: empty on edit means "do not change". */
  nullable?: boolean
  default?: unknown
}

/**
 * How a list column is shown.
 */
export type ColumnKind = 'text' | 'bool' | 'photo' | 'color' | 'ref' | 'date' | 'money' | 'badge'

/**
 * A column of a CMS list.
 */
export interface Column {
  key: string
  label: string
  kind?: ColumnKind
  ref?: string
  refLabel?: string
  sortable?: boolean
}

/**
 * A child table edited inside its parent.
 */
export interface Child {
  title: string
  /** Section key whose table is shown inside the form. */
  section: string
  /** Column of the child table pointing to the parent id. */
  fk: string
}

/**
 * A filter of a CMS list.
 */
export interface Filter {
  key: string
  label: string
  type: 'select' | 'checkbox'
  ref?: string
  /** Checkbox: query params set when checked. */
  params?: Record<string, string>
}

/**
 * A CMS section: a table with its list columns, form fields and filters.
 */
export interface Section {
  key: string
  title: string
  group: string
  permission: Permission
  /** `table` generic list + form; `roles` and `publish` have their own screens. */
  kind: 'table' | 'roles' | 'publish' | 'settings'
  table?: string
  columns?: Column[]
  fields?: Field[]
  ops?: { create?: boolean; update?: boolean; remove?: boolean }
  sort?: string
  dir?: 'asc' | 'desc'
  search?: boolean
  filters?: Filter[]
  children?: Child[]
  /** Read-only panel above the form. */
  details?: 'order' | 'cart' | 'client'
  preview?: 'seo'
  /** Hidden from the menu, only used as a child table. */
  hidden?: boolean
}

const ALL = { create: true, update: true, remove: true }
const photoField: Field = { key: 'photo', label: 'Файл', type: 'photo', required: true }
const priorityField: Field = { key: 'priority', label: 'Порядок', type: 'number', required: true, default: 10 }
const nameField: Field = { key: 'name', label: 'Название', type: 'text', required: true }
const nameCol: Column = { key: 'name', label: 'Название', sortable: true }
const prioCol: Column = { key: 'priority', label: 'Порядок', sortable: true }
const photoCol: Column = { key: 'photo', label: 'Фото', kind: 'photo' }

/**
 * Photo slots of a product.
 */
export const PHOTO_SLOTS = [
  { value: 'side', label: 'Сбоку' },
  { value: 'top', label: 'Сверху' },
  { value: 'board', label: 'Доска' }
]

/**
 * Payment states of an order.
 */
export const PAYMENT_STATES = [
  { value: 'not_paid', label: 'Не оплачен' },
  { value: 'pending', label: 'Ожидает оплаты' },
  { value: 'paid', label: 'Оплачен' },
  { value: 'failed', label: 'Оплата не прошла' },
  { value: 'refunded', label: 'Возврат' }
]

/**
 * Types of a site setting.
 */
export const SETTING_TYPES = [
  { value: 'text', label: 'Текст' },
  { value: 'html', label: 'HTML' },
  { value: 'number', label: 'Число' },
  { value: 'boolean', label: 'Да/нет' },
  { value: 'photo', label: 'Фото' }
]

/** Hints for the content of known page blocks (free JSON). */
export const BLOCK_HINTS: Record<string, string> = {
  hero: '{"title": "…", "text": "…"}',
  gallery: '{"title": "…"}',
  text: '{"title": "…", "html": "<p>…</p>"}',
  product: '{}',
  shops: '{}'
}

/**
 * All CMS sections in menu order.
 */
export const SECTIONS: Section[] = [
  // ---- Каталог ----
  {
    key: 'products', title: 'Товары', group: 'Каталог', permission: 'references', kind: 'table', table: 'product', ops: ALL,
    sort: 'id', search: true,
    columns: [{ key: 'id', label: '№', sortable: true }, nameCol, { key: 'description', label: 'Описание' }],
    fields: [
      nameField, { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'weight_g', label: 'Вес, г', type: 'number', nullable: true, hint: 'Нужен для расчёта доставки' },
      { key: 'length_mm', label: 'Длина, мм', type: 'number', nullable: true },
      { key: 'width_mm', label: 'Ширина, мм', type: 'number', nullable: true },
      { key: 'height_mm', label: 'Высота, мм', type: 'number', nullable: true }
    ]
  },
  {
    key: 'pairs', title: 'Пары цветов', group: 'Каталог', permission: 'references', kind: 'table', table: 'item', ops: ALL,
    sort: 'id', search: true,
    columns: [
      { key: 'id', label: '№', sortable: true }, nameCol,
      { key: 'product_id', label: 'Товар', kind: 'ref', ref: 'product' },
      { key: 'main_color', label: 'Основной', kind: 'color', ref: 'color' },
      { key: 'second_color', label: 'Второй', kind: 'color', ref: 'color' }
    ],
    fields: [
      nameField,
      { key: 'product_id', label: 'Товар', type: 'select', ref: 'product', required: true },
      { key: 'main_color', label: 'Основной цвет', type: 'select', ref: 'color', required: true },
      { key: 'second_color', label: 'Второй цвет', type: 'select', ref: 'color', required: true }
    ],
    children: [{ title: 'Фото пары', section: 'item-photos', fk: 'item_id' }]
  },
  {
    key: 'colors', title: 'Цвета', group: 'Каталог', permission: 'references', kind: 'table', table: 'color', ops: ALL,
    sort: 'code', search: true,
    columns: [
      { key: 'code', label: 'Код', sortable: true }, nameCol, { key: 'hex', label: 'Цвет', kind: 'color' }
    ],
    fields: [
      nameField,
      { key: 'code', label: 'Код (2 символа)', type: 'text', required: true, hint: 'Из кодов двух цветов складывается артикул пары' },
      { key: 'hex', label: 'Цвет', type: 'hex', hint: '6 символов без #' }
    ]
  },
  {
    key: 'item-photos', title: 'Фото пар', group: 'Каталог', permission: 'references', kind: 'table', table: 'item_photo', ops: ALL,
    sort: 'priority', hidden: true,
    columns: [nameCol, { key: 'slot', label: 'Слайд' }, prioCol, photoCol],
    fields: [nameField, priorityField, photoField, { key: 'slot', label: 'Слайд', type: 'enum', options: PHOTO_SLOTS, required: true }, { key: 'item_id', label: 'Пара', type: 'select', ref: 'item', required: true }]
  },
  {
    key: 'prices', title: 'Цены', group: 'Каталог', permission: 'prices', kind: 'table', table: 'price', ops: ALL,
    sort: 'price_date', dir: 'desc',
    columns: [
      { key: 'product_id', label: 'Товар', kind: 'ref', ref: 'product' },
      { key: 'price', label: 'Цена', kind: 'money', sortable: true },
      { key: 'price_date', label: 'Действует с', kind: 'date', sortable: true }
    ],
    fields: [
      { key: 'product_id', label: 'Товар', type: 'select', ref: 'product', required: true },
      { key: 'price', label: 'Цена, ₽', type: 'number', required: true },
      { key: 'price_date', label: 'Действует с', type: 'datetime', required: true, hint: 'Действует последняя цена, дата которой уже наступила' }
    ]
  },

  // ---- Сайт ----
  {
    key: 'pages', title: 'Страницы', group: 'Сайт', permission: 'pages', kind: 'table', table: 'page', ops: ALL,
    sort: 'id', search: true,
    columns: [{ key: 'slug', label: 'Адрес', sortable: true }, nameCol],
    fields: [
      { key: 'slug', label: 'Адрес (slug)', type: 'text', required: true, hint: 'Латиница, цифры и дефис; index — главная' },
      nameField
    ],
    children: [{ title: 'Блоки страницы', section: 'page-blocks', fk: 'page_id' }]
  },
  {
    key: 'page-blocks', title: 'Блоки', group: 'Сайт', permission: 'pages', kind: 'table', table: 'page_block', ops: ALL,
    sort: 'priority', hidden: true,
    columns: [{ key: 'code', label: 'Код', sortable: true }, prioCol],
    fields: [
      { key: 'page_id', label: 'Страница', type: 'select', ref: 'page', refLabel: 'name', required: true },
      { key: 'code', label: 'Код блока', type: 'text', required: true, hint: 'gallery, text, columns, product, colors' },
      priorityField,
      { key: 'content', label: 'Содержимое (JSON)', type: 'json', required: true, default: {} }
    ]
  },
  {
    key: 'seo', title: 'SEO', group: 'Сайт', permission: 'seo', kind: 'table', table: 'seo', ops: ALL,
    sort: 'id', search: true, preview: 'seo',
    columns: [
      { key: 'page_id', label: 'Страница', kind: 'ref', ref: 'page', refLabel: 'name' },
      { key: 'title', label: 'Заголовок', sortable: true },
      { key: 'robots_index', label: 'Индексация', kind: 'bool' }
    ],
    fields: [
      { key: 'page_id', label: 'Страница', type: 'select', ref: 'page', refLabel: 'name', required: true },
      { key: 'title', label: 'Заголовок (title)', type: 'text', required: true },
      { key: 'description', label: 'Описание (description)', type: 'textarea', required: true },
      { key: 'og_title', label: 'Заголовок для соцсетей', type: 'text', hint: 'Пусто — берётся title' },
      { key: 'og_description', label: 'Описание для соцсетей', type: 'textarea', hint: 'Пусто — берётся description' },
      { key: 'og_image', label: 'Картинка для соцсетей', type: 'photo' },
      { key: 'robots_index', label: 'Разрешить индексацию', type: 'boolean', default: true }
    ]
  },
  { key: 'settings', title: 'Настройки', group: 'Сайт', permission: 'settings', kind: 'settings', table: 'setting' },
  {
    key: 'index-photos', title: 'Фото главной', group: 'Сайт', permission: 'references', kind: 'table', table: 'index_photo', ops: ALL,
    sort: 'priority', search: true,
    columns: [nameCol, prioCol, photoCol],
    fields: [nameField, priorityField, photoField]
  },
  {
    key: 'shops', title: 'Где купить', group: 'Сайт', permission: 'references', kind: 'table', table: 'shops', ops: ALL,
    sort: 'id', search: true,
    columns: [nameCol, { key: 'address', label: 'Адрес' }, { key: 'phone', label: 'Телефон' }],
    fields: [
      nameField,
      { key: 'address', label: 'Адрес', type: 'text', required: true },
      { key: 'working_hours', label: 'Часы работы', type: 'text' },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'web_site', label: 'Сайт', type: 'text' }
    ],
    children: [{ title: 'Фото магазина', section: 'shop-photos', fk: 'shop_id' }]
  },
  {
    key: 'shop-photos', title: 'Фото магазинов', group: 'Сайт', permission: 'references', kind: 'table', table: 'shop_photo', ops: ALL,
    sort: 'priority', hidden: true,
    columns: [nameCol, prioCol, photoCol],
    fields: [nameField, priorityField, photoField, { key: 'shop_id', label: 'Магазин', type: 'select', ref: 'shops', required: true }]
  },
  {
    key: 'seller', title: 'Продавец', group: 'Сайт', permission: 'references', kind: 'table', table: 'seller', ops: ALL,
    sort: 'id',
    columns: [nameCol, { key: 'inn', label: 'ИНН' }, { key: 'ogrn', label: 'ОГРН' }],
    fields: [
      nameField,
      { key: 'ogrn', label: 'ОГРН', type: 'text', required: true },
      { key: 'inn', label: 'ИНН', type: 'text', required: true },
      { key: 'kpp', label: 'КПП', type: 'text', required: true },
      { key: 'address', label: 'Адрес', type: 'text', required: true },
      { key: 'phone', label: 'Телефон', type: 'text', required: true }
    ]
  },

  // ---- Продажи ----
  {
    key: 'orders', title: 'Заказы', group: 'Продажи', permission: 'orders', kind: 'table', table: 'order', ops: { update: true },
    sort: 'number', dir: 'desc', search: true, details: 'order',
    columns: [
      { key: 'number', label: '№', sortable: true },
      { key: 'date', label: 'Дата', kind: 'date', sortable: true },
      { key: 'name', label: 'Покупатель' },
      { key: 'sum', label: 'Сумма', kind: 'money', sortable: true },
      { key: 'state', label: 'Статус', kind: 'badge' },
      { key: 'payment_state', label: 'Оплата', kind: 'badge' }
    ],
    filters: [{ key: 'order_state_id', label: 'Статус', type: 'select', ref: 'order_state' }],
    fields: [
      { key: 'order_state_id', label: 'Статус', type: 'select', ref: 'order_state', required: true },
      { key: 'payment_state', label: 'Оплата', type: 'enum', options: PAYMENT_STATES, required: true },
      { key: 'delivery_reference', label: 'Трек-номер', type: 'text', hint: 'При сохранении нового номера покупателю уходит письмо со ссылкой на отслеживание' },
      { key: 'comment', label: 'Комментарий', type: 'textarea' }
    ]
  },
  {
    key: 'clients', title: 'Клиенты', group: 'Продажи', permission: 'clients', kind: 'table', table: 'client',
    ops: { update: true, remove: true }, sort: 'id', dir: 'desc', search: true, details: 'client',
    columns: [
      { key: 'id', label: '№', sortable: true }, nameCol, { key: 'family_name', label: 'Фамилия' },
      { key: 'phone', label: 'Телефон' }, { key: 'e_mail', label: 'Почта' }, { key: 'city', label: 'Город' }
    ],
    fields: [
      nameField,
      { key: 'family_name', label: 'Фамилия', type: 'text' },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'e_mail', label: 'Почта', type: 'text' },
      { key: 'address_delivery', label: 'Доставка до двери', type: 'boolean' },
      { key: 'delivery_address', label: 'Адрес доставки', type: 'text' },
      { key: 'delivery_point_code', label: 'Код пункта выдачи', type: 'text' }
    ]
  },
  {
    key: 'carts', title: 'Корзины', group: 'Продажи', permission: 'carts', kind: 'table', table: 'cart', ops: { remove: true },
    sort: 'last_updated', dir: 'desc', details: 'cart',
    columns: [
      { key: 'id', label: '№', sortable: true },
      { key: 'client', label: 'Клиент' },
      { key: 'sum', label: 'Сумма', kind: 'money', sortable: true },
      { key: 'last_updated', label: 'Изменена', kind: 'date', sortable: true },
      { key: 'ordered', label: 'Оформлена', kind: 'date' }
    ],
    filters: [
      { key: 'abandoned', label: 'Брошенные (дольше 24 ч)', type: 'checkbox', params: { abandoned: '1', hours: '24' } },
      { key: 'ordered', label: 'Не оформленные', type: 'checkbox', params: { ordered: '0' } }
    ],
    fields: []
  },
  {
    key: 'delivery-tariffs', title: 'Тарифы доставки', group: 'Продажи', permission: 'prices', kind: 'table', table: 'delivery_tariff', ops: ALL,
    sort: 'priority', search: true,
    columns: [
      nameCol, { key: 'city', label: 'Город' }, { key: 'weight_to', label: 'Вес до, г' },
      { key: 'price', label: 'Цена', kind: 'money' }, prioCol
    ],
    fields: [
      nameField,
      { key: 'address_delivery', label: 'До двери (иначе — пункт выдачи)', type: 'boolean' },
      { key: 'city', label: 'Город', type: 'text', nullable: true, hint: 'Пусто — любой город; тариф города выбирается раньше общего' },
      { key: 'weight_to', label: 'Вес до, г', type: 'number', nullable: true, hint: 'Пусто — без ограничения' },
      { key: 'price', label: 'Цена, ₽', type: 'number', required: true },
      { ...priorityField, hint: 'Меньше — раньше, при прочих равных' }
    ]
  },
  {
    key: 'order-states', title: 'Статусы заказа', group: 'Продажи', permission: 'references', kind: 'table', table: 'order_state', ops: ALL,
    sort: 'priority',
    columns: [nameCol, prioCol],
    fields: [nameField, { ...priorityField, hint: 'Статус с наименьшим порядком получает новый заказ' }]
  },

  // ---- Система ----
  {
    key: 'users', title: 'Пользователи', group: 'Система', permission: 'users', kind: 'table', table: 'user', ops: ALL,
    sort: 'id', search: true,
    columns: [
      nameCol, { key: 'login', label: 'Логин', sortable: true }, { key: 'role_id', label: 'Роль', kind: 'ref', ref: 'role' }
    ],
    fields: [
      nameField,
      { key: 'login', label: 'Логин', type: 'text', required: true },
      { key: 'password', label: 'Пароль', type: 'password', hint: 'Не меньше 8 символов. При правке пусто — не менять' },
      { key: 'role_id', label: 'Роль', type: 'select', ref: 'role', required: true }
    ]
  },
  { key: 'roles', title: 'Роли и права', group: 'Система', permission: 'users', kind: 'roles' },
  { key: 'publish', title: 'Публикация', group: 'Система', permission: 'publish', kind: 'publish' }
]

/**
 * Finds a section.
 * @param key - Section key.
 * @returns The section, or undefined.
 */
export function sectionByKey(key: string): Section | undefined {
  return SECTIONS.find((s) => s.key === key)
}

/** Sections of the menu visible for the permission list of a role. */
export function visibleSections(permissions: readonly string[]): Section[] {
  return SECTIONS.filter((s) => !s.hidden && permissions.includes(s.permission))
}

/** Menu groups in registry order. */
export function groupSections(sections: Section[]): { group: string; sections: Section[] }[] {
  const out: { group: string; sections: Section[] }[] = []
  for (const s of sections) {
    let g = out.find((x) => x.group === s.group)
    if (!g) out.push((g = { group: s.group, sections: [] }))
    g.sections.push(s)
  }
  return out
}
