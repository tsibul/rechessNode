<template>
  <div class="cms-container">
    <header class="site-header">
      <div class="container">
        <div class="menu-frame">
          <nav>
            <ul class="menu">
              <li class="menu__item" id="home">
                <a href="/" class="pt-sans-regular">главная</a>
              </li>
              <li class="menu__item" id="orders">
                <a href="#" @click.prevent="currentComponent = 'orders'" class="pt-sans-regular">заказы</a>
              </li>
              <li class="menu__item" id="clients">
                <a href="#" @click.prevent="currentComponent = 'clients'" class="pt-sans-regular">клиенты</a>
              </li>
              <li class="menu__item" id="settings">
                <a href="#" @click.prevent="currentComponent = 'settings'" class="pt-sans-regular">настройки</a>
              </li>
              <li class="menu__item" id="cart">
                <a href="#" @click.prevent="currentComponent = 'cart'" class="pt-sans-regular">корзина</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>

    <!-- CMS Content -->
    <main class="cms-content">
      <div class="cms-content-wrapper">
        <!-- Settings Component -->
        <CMSettingsComponent
          v-if="currentComponent === 'settings'"
        />

        <!-- Clients Component -->
        <ClientComponent
          v-if="currentComponent === 'clients'"
        />

        <!-- Orders Component -->
        <OrderComponent
          v-if="currentComponent === 'orders'"
        />

        <!-- Cart Component -->
        <CartComponent
          v-if="currentComponent === 'cart'"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CMSettingsComponent from '../../components/cms/CMSettingsComponent.vue'
import ClientComponent from '../../components/cms/ClientComponent.vue'
import OrderComponent from '../../components/cms/OrderComponent.vue'
import CartComponent from '../../components/cms/CartComponent.vue'

// Current active component
const currentComponent = ref('settings')

// Set settings as default component on mount
onMounted(() => {
  currentComponent.value = 'settings'
})
</script>

<style lang="scss" scoped>
@use '../../styles/vars' as *;
@use '../../styles/mixins' as *;

.cms-container {
  min-height: 100vh;
}

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

.cms-content {
  padding: 2rem 0;
  margin-top: 70px;
}

.cms-content-wrapper {
  max-width: $displayWidth;
  //margin: 0 auto;
  //padding: 0 1rem;
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
