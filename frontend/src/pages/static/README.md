## Static Pages Structure

Each static page consists of 4 components:

1. SEO (unique for each page)
   - Meta tags
   - Open Graph
   - Twitter cards
   - Yandex meta

2. Header (shared)
   - Navigation
   - Auth controls
   - Cart status

3. Content (unique for each page)
   - Page specific content
   - Located in `/pages/static/{pageName}/content/`

4. Footer (shared)
   - Common footer elements
   - Links
   - Copyright

### Page Structure Example:
```
/pages/static/
  ├── index/
  │   ├── seo/
  │   └── content/
  ├── shop/
  │   ├── seo/
  │   └── content/
  └── about/
      ├── seo/
      └── content/

/components/shared/
  ├── Header/
  └── Footer/
```

### Build Process
- Each page is pre-rendered during build
- Shared components are included in each page
- SEO components are merged based on page context
- Content is loaded from respective page directories 