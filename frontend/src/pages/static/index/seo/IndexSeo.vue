<script setup lang="ts">
import { useHead } from '@vueuse/head'

// SEO мета-теги для главной страницы
useHead({
  title: 'reChess — дизайнерские шахматы',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { 'http-equiv': 'X-UA-Compatible', content: 'ie=edge' },
    { name: 'description', content: 'Авторские шахматы reChess: уникальный дизайн, экологичное производство, вдохновляющая игра. Магазин, история проекта, команда.' },
    
    // Open Graph для соцсетей
    { property: 'og:title', content: 'reChess — дизайнерские шахматы' },
    { property: 'og:description', content: 'Авторские шахматы reChess: уникальный дизайн и экологичное производство.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://rechess.ru/' },
    { property: 'og:image', content: 'https://rechess.ru/img/shop3.jpg' },
    { property: 'og:image:alt', content: 'reChess: авторские шахматы' },
    { property: 'og:locale', content: 'ru_RU' },
    { property: 'og:site_name', content: 'reChess' },
    
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'reChess — дизайнерские шахматы' },
    { name: 'twitter:description', content: 'Авторские шахматы reChess: уникальный дизайн и экологичное производство.' },
    { name: 'twitter:image', content: 'https://rechess.ru/img/shop3.jpg' },
    { name: 'twitter:site', content: '@rechess_ru' },
    { name: 'twitter:creator', content: '@rechess_ru' },
    
    // Robots
    { name: 'robots', content: 'index, follow' }
  ],
  link: [
    { rel: 'canonical', href: 'https://rechess.ru/' }
  ],
  script: [
    // JSON-LD WebSite
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": "https://rechess.ru/",
        "name": "reChess — дизайнерские шахматы",
        "description": "Авторские шахматы reChess: уникальный дизайн, экологичное производство, вдохновляющая игра.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://rechess.ru/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      })
    },
    // JSON-LD Organization
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ООО Вики Восток Сувенир",
        "url": "https://rechess.ru/",
        "logo": "https://rechess.ru/icon.svg",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+7 926 602 64 41",
          "contactType": "customer service",
          "availableLanguage": "Russian"
        },
        "sameAs": [
          "https://wa.me/79266026441"
        ]
      })
    },
    // JSON-LD ImageGallery
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": "Галерея шахматных изделий reChess",
        "description": "Фотографии дизайнерских шахматных изделий reChess.",
        "associatedMedia": Array.from({ length: 30 }, (_, i) => ({
          "@type": "ImageObject",
          "contentUrl": `https://rechess.ru/img/${i + 1}.jpg`,
          "name": "Дизайнерские шахматы reChess",
          "description": "Фотография дизайнерских шахмат reChess"
        }))
      })
    },
    // Yandex.Metrika
    {
      type: 'text/javascript',
      innerHTML: `
        (function (m, e, t, r, i, k, a) {
          m[i] = m[i] || function () {
            (m[i].a = m[i].a || []).push(arguments)
          };
          m[i].l = 1 * new Date();
          for (var j = 0; j < document.scripts.length; j++) {
            if (document.scripts[j].src === r) {
              return;
            }
          }
          k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
        })
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(101425217, "init", {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true
        });
      `
    },
    // VK Pixel
    {
      type: 'text/javascript',
      innerHTML: `
        !function () {
          const t = document.createElement("script");
          t.type = "text/javascript";
          t.async = !0;
          t.src = 'https://vk.ru/js/api/openapi.js?173';
          t.onload = function () {
            VK.Retargeting.Init("VK-RTRG-1949091-cI2FI");
            VK.Retargeting.Hit()
          }
          document.head.appendChild(t)
        }();
      `
    }
  ],
  noscript: [
    // Yandex.Metrika noscript
    {
      children: '<div><img src="https://mc.yandex.ru/watch/101425217" style="position:absolute; left:-9999px;" alt=""/></div>'
    },
    // VK Pixel noscript
    {
      children: '<img src="https://vk.ru/rtrg?p=VK-RTRG-1949091-cI2FI" style="position:fixed; left:-999px;" alt=""/>'
    }
  ]
})
</script>

<template>
  <!-- Этот компонент только обновляет мета-теги -->
</template> 