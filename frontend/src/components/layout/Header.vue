<script setup lang="ts">
defineOptions({ name: 'SiteHeader' })
</script>

<template>
  <header class="site-header">
    <nav class="menu-frame" aria-label="Основное меню">
      <ul class="menu">
        <li class="menu__item"><router-link to="/">ReChess</router-link></li>
        <li class="menu__item"><router-link to="/about">О проекте</router-link></li>
        <li class="menu__item"><router-link to="/shop">Магазин</router-link></li>
        <li class="menu__item"><router-link to="/where-to-buy">Где купить</router-link></li>
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
  gap: 60px;
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
    gap: 40px;
  }
}

@media (max-width: 660px) {
  .menu {
    gap: 14px;
  }
}
</style>
