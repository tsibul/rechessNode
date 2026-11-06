<!--
/**
 * Empty page, built once as `app-shell.html`. The web server answers with it for the routes that are
 * not prerendered (/cart, /order, /order/<number>, /cms): the browser loads the app and the router
 * draws the real page. Not indexed, not in the sitemap.
 * @component AppShell
 */
-->
<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({ title: 'reChess', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div />
</template>
