<template>
  <!-- SEO component doesn't render anything visually -->
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

interface SEOProps {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  ogUrl?: string;
}

const props = withDefaults(defineProps<SEOProps>(), {
  ogImage: '/og-image.jpg',
  ogUrl: window.location.href
});

onMounted(() => {
  // Update meta tags
  document.title = props.title;
  updateMetaTag('description', props.description);
  updateMetaTag('keywords', props.keywords);
  
  // Update Open Graph tags
  updateMetaTag('og:title', props.title, 'property');
  updateMetaTag('og:description', props.description, 'property');
  updateMetaTag('og:image', props.ogImage, 'property');
  updateMetaTag('og:url', props.ogUrl, 'property');
  
  // Update Twitter tags
  updateMetaTag('twitter:title', props.title, 'property');
  updateMetaTag('twitter:description', props.description, 'property');
  updateMetaTag('twitter:image', props.ogImage, 'property');
});

function updateMetaTag(name: string, content: string, attributeName: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attributeName}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}
</script> 