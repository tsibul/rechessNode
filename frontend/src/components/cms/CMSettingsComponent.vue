<template>
  <div class="cms-settings">
    <div class="cms-settings__grid">
      <div class="cms-settings__column">
        <div class="cms-settings__column-title">Фото</div>
        <div class="cms-settings__column-items">
          <button @click="openModal('main-photos')" class="cms-settings__item">
            Фото главной страницы
          </button>
          <button @click="openModal('shop-photos')" class="cms-settings__item">
            Фото магазина
          </button>
          <button @click="openModal('item-photos')" class="cms-settings__item">
            Фото товаров
          </button>
        </div>
      </div>

      <!-- Товары и Цены -->
      <div class="cms-settings__column">
        <div class="cms-settings__column-title">Товары и Цены</div>
        <div class="cms-settings__column-items">
          <button @click="openModal('items')" class="cms-settings__item">
            Товары
          </button>
          <button @click="openModal('colors')" class="cms-settings__item">
            Цвета
          </button>
          <button @click="openModal('prices')" class="cms-settings__item">
            Цены
          </button>
        </div>
      </div>

      <!-- Прочее -->
      <div class="cms-settings__column">
        <div class="cms-settings__column-title">Прочее</div>
        <div class="cms-settings__column-items">
          <button @click="openModal('shops')" class="cms-settings__item">
            Где купить
          </button>
          <button @click="openModal('sellers')" class="cms-settings__item">
            Продавец
          </button>
          <button @click="openModal('users')" class="cms-settings__item">
            Пользователи
          </button>
          <button @click="openModal('order-states')" class="cms-settings__item">
            Состояния заказа
          </button>
        </div>
      </div>
    </div>

    <!-- Модальные окна -->
    <ModalWindow
      v-if="isModalOpen"
      :reference-name="currentModalType"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalWindow from './modals/ModalWindow.vue'

interface TableItem {
  id: number
  [key: string]: any
}

const isModalOpen = ref(false)
const currentModalType = ref('')

const openModal = (type: string) => {
  currentModalType.value = type
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  currentModalType.value = ''
}
</script>

<style lang="scss" scoped>
@use '../../styles/vars' as *;
@use '../../styles/mixins' as *;

.cms-settings {
  margin-left: 15px;

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
  }

  &__column {
    border-radius: 8px;
    width: 360px
  }

  &__column-title {
    margin: 0 0 1rem 1rem;
    color: $colorPrimary900;
  }

  &__column-items {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  &__item {
    background: $colorNeutral100;
    border: 1px solid $colorPrimary500;
    border-radius: 4px;
    padding: 0.75rem 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;

    &:hover {
      background: $colorPrimary500;
      border-color: $colorPrimary900;
    }
  }
}
</style>
