export interface TableColumn {
  key: string
  label: string
  width: string
  type?: 'text' | 'boolean' | 'foreign' | 'photo'
  foreignTable?: string
  foreignKey?: string
  foreignName?: string
}

export interface TableSchema {
  title: string
  columns: TableColumn[]
}

export const tableSchemas: Record<string, TableSchema> = {
  'main-photos': {
    title: 'Фото главной страницы',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'priority', label: 'Приоритет', width: '1fr', type: 'text' },
      { key: 'photo', label: 'Фото', width: '3fr', type: 'photo' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'shop-photos': {
    title: 'Фото магазина',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'priority', label: 'Приоритет', width: '1fr', type: 'text' },
      { key: 'photo', label: 'Фото', width: '3fr', type: 'photo' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'item-photos': {
    title: 'Фото товаров',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'priority', label: 'Приоритет', width: '1fr', type: 'text' },
      { key: 'photo', label: 'Фото', width: '3fr', type: 'photo' },
      { key: 'item_id', label: 'Товар', width: '2fr', type: 'foreign', foreignTable: 'item', foreignKey: 'id', foreignName: 'name' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'items': {
    title: 'Товары',
    columns: [
      { key: 'name', label: 'Название', width: '2.5fr', type: 'text' },
      { key: 'main_color', label: 'Основной цвет', width: '1.5fr', type: 'foreign', foreignTable: 'color', foreignKey: 'id', foreignName: 'name' },
      { key: 'second_color', label: 'Дополнительный цвет', width: '1.5fr', type: 'foreign', foreignTable: 'color', foreignKey: 'id', foreignName: 'name' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'colors': {
    title: 'Цвета',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'code', label: 'Код', width: '1fr', type: 'text' },
      { key: 'hex', label: 'HEX код', width: '1fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'prices': {
    title: 'Цены',
    columns: [
      { key: 'price', label: 'Цена', width: '1fr', type: 'text' },
      { key: 'item', label: 'Товар', width: '1fr', type: 'text' },
      { key: 'price_date', label: 'Дата цены', width: '1.5fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'shops': {
    title: 'Где купить',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'address', label: 'Адрес', width: '3fr', type: 'text' },
      { key: 'phone', label: 'Телефон', width: '1.5fr', type: 'text' },
      { key: 'web_site', label: 'Сайт', width: '2fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'sellers': {
    title: 'Продавцы',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'ogrn', label: 'ОГРН', width: '1.5fr', type: 'text' },
      { key: 'inn', label: 'ИНН', width: '1.5fr', type: 'text' },
      { key: 'kpp', label: 'КПП', width: '1fr', type: 'text' },
      { key: 'address', label: 'Адрес', width: '3fr', type: 'text' },
      { key: 'phone', label: 'Телефон', width: '1.5fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'users': {
    title: 'Пользователи',
    columns: [
      { key: 'name', label: 'Имя', width: '2fr', type: 'text' },
      { key: 'login', label: 'Логин', width: '2fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  },
  'order-states': {
    title: 'Состояния заказа',
    columns: [
      { key: 'name', label: 'Название', width: '2fr', type: 'text' },
      { key: 'priority', label: 'Приоритет', width: '1fr', type: 'text' },
      { key: 'deleted', label: 'Удалено', width: '1fr', type: 'boolean' }
    ]
  }
} 