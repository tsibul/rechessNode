import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ReChess Frontend',
  description: 'Frontend documentation for ReChess project',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Components', link: '/components/' },
      { text: 'Pages', link: '/pages/' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Project Structure', link: '/project-structure' }
        ]
      },
      {
        text: 'Components',
        items: [
          { text: 'Overview', link: '/components/' },
          { text: 'Floating Components', link: '/components/floating' },
          { text: 'Shop Components', link: '/components/shop' }
        ]
      },
      {
        text: 'Pages',
        items: [
          { text: 'Static Pages', link: '/pages/static' },
          { text: 'Dynamic Pages', link: '/pages/dynamic' }
        ]
      },
      {
        text: 'State Management',
        items: [
          { text: 'Store Overview', link: '/store/' },
          { text: 'Cart Store', link: '/store/cart' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/rechess' }
    ]
  }
}) 