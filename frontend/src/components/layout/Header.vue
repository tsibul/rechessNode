<template>
  <header class="site-header">
    <div class="container">
      <div class="menu-frame">
        <nav>
          <ul class="menu">
            <li class="menu__item" id="rechess">
              <a href="/" class="pt-sans-regular">rechess</a>
            </li>
            <li class="menu__item" id="about">
              <a href="/about" class="pt-sans-regular">о проекте</a>
            </li>
            <li class="menu__item" id="shop">
              <a href="/shop" class="pt-sans-regular">магазин</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Header',
  ssg: true
})
</script>

<style lang="scss" scoped>
@use '../../styles/vars' as *;

.menu-frame {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: transparent;
}

.menu {
  display: flex;
  margin-left: 15px;
  justify-content: space-between;
  align-items: center;
  height: 70px;
  gap: 60px;
  max-width: 1110px;
  background-color: transparent;

  &__item {
    padding: 2px 0;
    cursor: pointer;
    background-color: transparent;

    & * {
      background-color: transparent;
    }
  }
}


@media(max-width: 1160px) {
  .menu {
    margin-right: 15px;
  }
}


@media(max-width: 660px) {
  .menu {
    gap: 8px;
  }
}


</style>
