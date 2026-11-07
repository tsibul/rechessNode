<script setup lang="ts">
/** Site header with navigation. */
defineOptions({ name: 'SiteHeader' })
</script>

<template>
  <header class="site-header">
    <nav class="menu-frame" aria-label="Основное меню">
      <ul class="menu">
        <li class="menu__item"><router-link to="/">rechess</router-link></li>
        <li class="menu__item"><router-link to="/about">о проекте</router-link></li>
        <li class="menu__item"><router-link to="/shop">магазин</router-link></li>
      </ul>
    </nav>
  </header>
</template>

<style lang="scss" scoped>
.menu-frame {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  background-color: #fff;
}

.menu {
  display: flex;
  align-items: center;
  height: 70px;
  justify-content: space-between;
  max-width: 1140px;
  padding: 0 15px;

  &__item {
    padding: 2px 0;

    a.router-link-exact-active {
      text-decoration: underline;
    }
  }
}

@media (max-width: 1160px) {
  .menu {
    justify-content: flex-start;
    gap: 48px;
    padding: 0 20px;
  }
}

@media (max-width: 660px) {
  .menu {
    justify-content: space-between;
    max-width: none;
    gap: 0;
    padding: 0 15px;
  }
}
</style>
