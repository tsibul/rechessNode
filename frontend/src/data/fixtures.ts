/**
 * Development content. Shape and values follow backend/src/db/seeds/01_dev_data.ts
 * and the migration defaults; texts are written for the site and are replaced
 * from the CMS. Photos are in frontend/public/media, texts are from the Figma file.
 */
import type { ColorPair, PageContent, Photo, Shop, SiteContent } from './types'
import figma from './content.json'

const SITE_URL = 'https://rechess.ru'

function photo(name: string, alt: string, w: number, h: number): Photo {
  return { src: `/media/${name}.jpg`, alt, ratio: w / h }
}

const horizontalIndex = new Set([6, 10, 11, 15, 17, 25])
const indexPhotos = (n: number): Photo[] => Array.from({ length: n }, (_, i) => {
  const k = i + 1
  const name = `index-${String(k).padStart(2, '0')}`
  return horizontalIndex.has(k) ? photo(name, `Фото ${k}`, 1080, 860) : photo(name, `Фото ${k}`, 860, 1080)
})
const shopPhotos = (): Photo[] => [1, 2, 3, 4, 5, 6].map((k) => (k === 5 ? photo(`shop-${k}`, `Шахматы ReChess ${k}`, 1080, 860) : photo(`shop-${k}`, `Шахматы ReChess ${k}`, 860, 1080)))

// Measured on the pair photos of the Figma file (frame 2724:75): median of the piece pixels.
// The file has no solid colour fills for the pieces.
const hex = {
  ash: '#A5AAA9', anthracite: '#535454', terracotta: '#CA5C78', turquoise: '#46988F',
  emerald: '#64BE86', ochre: '#BBAB50', carmine: '#B45656', aquamarine: '#5D9DB8'
}
const c = (name: string, hexValue: string) => ({ name, hex: hexValue })

function pairs(): ColorPair[] {
  const list: Array<[string, string, string, string, string]> = [
    ['01 пепельный / 02 антрацитовый', 'пепельный', hex.ash, 'антрацитовый', hex.anthracite],
    ['01 пепельный / 04 терракотовый', 'пепельный', hex.ash, 'терракотовый', hex.terracotta],
    ['01 пепельный / 10 бирюзовый', 'пепельный', hex.ash, 'бирюзовый', hex.turquoise],
    ['09 изумрудный / 02 антрацитовый', 'изумрудный', hex.emerald, 'антрацитовый', hex.anthracite],
    ['03 охристый / 19 карминовый', 'охристый', hex.ochre, 'карминовый', hex.carmine],
    ['01 пепельный / 19 карминовый', 'пепельный', hex.ash, 'карминовый', hex.carmine],
    ['01 пепельный / 06 аквамариновый', 'пепельный', hex.ash, 'аквамариновый', hex.aquamarine]
  ]
  return list.map(([name, m, mh, s, sh], i) => ({
    id: i + 1, name, main: c(m, mh), second: c(s, sh),
    photos: [
      photo(`pair-${i + 1}`, `Шахматы ReChess: ${name}, фигуры сбоку`, 1082, 862),
      photo(`top-${i + 1}`, `Шахматы ReChess: ${name}, фигуры сверху`, 1080, 860),
      photo(`board-${i + 1}`, `Шахматы ReChess: ${name}, доска с фигурами`, 1080, 860)
    ]
  }))
}

function shops(): Shop[] {
  return [{
    id: 1, name: 'ГЭС-2', address: 'Болотная набережная, вл. 15, к. 1',
    workingHours: '11:00–23:00, ежедневно', phone: null, webSite: 'https://ges-2.org', photos: []
  }]
}

function page(slug: string, name: string, title: string, description: string, blocks: PageContent['blocks'], robotsIndex = true): PageContent {
  return { slug, name, seo: { title, description, robotsIndex }, blocks }
}

export const devContent: SiteContent = {
  settings: {
    'site.name': 'reChess',
    'site.url': SITE_URL,
    'contact.email': figma.footer.email,
    'contact.phone': figma.footer.phone,
    'contact.whatsapp': 'https://wa.me/79266026441',
    'contact.instagram': figma.footer.instagram,
    'footer.credit': figma.footer.credit,
    'shop.buy_note': figma.buy_note,
    'shop.corporate_title': figma.corporate_title,
    'shop.corporate': figma.corporate_text,
    'social.twitter': '@rechess_ru',
    // Numbers from the old IndexSeo.vue, rendering is stage 9
    'counter.metrika': '101425217',
    'counter.vk': 'VK-RTRG-1949091-cI2FI',
    'cookie.banner.text': 'Этот сайт использует файлы cookie. Подробнее — в <a href="/privacy">политике конфиденциальности</a>.',
    'cookie.banner.button': 'Ок'
  },
  seller: {
    name: 'ООО «Вики Восток Сувенир»', ogrn: '', inn: '5001021228',
    address: 'Московская область, Балашиха, деревня Полтево, владение 115', phone: figma.footer.phone
  },
  product: {
    id: 1,
    name: figma.product.name,
    description: figma.product.description,
    price: figma.product.price,
    pairs: pairs()
  },
  shops: shops(),
  pages: [
    page('index', 'Главная', 'reChess — дизайнерские шахматы из переработанного пластика',
      'Авторские шахматы reChess: уникальный дизайн, переработанный пластик, ручная доводка. Выберите пару цветов и закажите онлайн.',
      [{ code: 'gallery', photos: indexPhotos(32) }]),
    page('about', 'О проекте', 'О проекте reChess — как делают шахматы из переработанного пластика',
      'История проекта reChess: как отходы производства превращаются в шахматные фигуры, из чего и кем сделаны наши шахматы.',
      [{ code: 'text', title: 'О проекте', hideTitle: true, html: figma.about_html }]),
    page('shop', 'Магазин', 'Купить шахматы reChess — цена, цвета, доставка',
      'Шахматы reChess из переработанного пластика: цена, цветовые пары, где купить и как заказать.',
      [{ code: 'product' }, { code: 'gallery', photos: shopPhotos() }]),
    page('colors', 'Цвета', 'Цвета шахмат reChess — семь цветовых пар',
      'Семь вариантов цветовых пар шахматного набора reChess из полиалюминия: выберите сочетание и добавьте набор в корзину.',
      [
        { code: 'text', title: 'Цвета', hideTitle: true, html: `<p>${figma.colors_intro.name.replace('\n', '<br>')}</p><p>${figma.colors_intro.description}</p>` },
        { code: 'colors' }
      ]),
    page('privacy', 'Политика конфиденциальности', 'Политика конфиденциальности — reChess',
      'Реквизиты продавца, политика использования файлов cookie и политика конфиденциальности сайта reChess.',
      [{ code: 'columns', title: 'Политика конфиденциальности', columns: figma.legal }]),
    page('personal-data', 'Политика обработки персональных данных', 'Политика обработки персональных данных — reChess',
      'Политика использования файлов cookie и политика обработки персональных данных сайта reChess.',
      [{ code: 'text', title: figma.personal_data.title, html: figma.personal_data.html }])
  ]
}
