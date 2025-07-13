<!--
/**
 * Root component of the ReChess application.
 * Handles layout and global components like floating elements.
 * @component App
 */
-->
<script setup lang="ts">
// Root component setup
</script>

<template>
  <div class="app">
    <!-- Main content -->
    <router-view />
  </div>
</template>

<style>
/* Global styles */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Reset default styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Base typography */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Responsive container */
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Utility classes */
.text-center {
  text-align: center;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.gap-4 {
  gap: 1rem;
}
</style> 