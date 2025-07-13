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

<style lang="scss">
// Подключение переменных и миксинов
@use './styles/vars' as *;
@use './styles/mixins' as *;

// Подключение шрифтов
@font-face {
  font-family: 'PragmaticaWebMedium';
  src: url('./assets/fonts/pragmatica_medium.woff') format('woff'),
  url('./assets/fonts/pragmatica_medium.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

/* Global styles */

/* Reset default styles */
* {
  font-family: 'PragmaticaWebMedium', sans-serif;
  padding: 0;
  margin: 0;
  font-size: 17px;
  line-height: 19px;
  box-sizing: border-box;
  background-color: $colorNeutral100;

  &::selection {
    color: $colorNeutral100;
    background-color: $colorPrimary900;
  }
}

/* Responsive container */
.container {
  max-width: $displayWidth;
  height: 100%;
}

a {
  text-decoration: none;
  color: $colorPrimary900;
  border-color: transparent;
}

nav {
  background-color: transparent;
}

li {
  list-style: none
}


@media(max-width: 660px) {
  * {
    font-size: 16px;
    line-height: 18px;
  }
}

</style>
