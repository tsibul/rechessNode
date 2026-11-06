<script setup lang="ts">
import { getSeller, getShops } from '@/data/content'
import PhotoItem from './PhotoItem.vue'

const shops = getShops()
const seller = getSeller()
</script>

<template>
  <section class="shops" data-testid="shops">
    <h1 class="shops__title">Где купить</h1>
    <ul class="shops__list">
      <li v-for="shop in shops" :key="shop.id" class="shop">
        <div class="shop__photos">
          <PhotoItem v-for="(p, i) in shop.photos" :key="i" :photo="p" />
        </div>
        <div class="shop__info">
          <h2 class="shop__name">{{ shop.name }}</h2>
          <p>{{ shop.address }}</p>
          <p v-if="shop.workingHours">{{ shop.workingHours }}</p>
          <p v-if="shop.phone"><a :href="`tel:${shop.phone}`">{{ shop.phone }}</a></p>
          <p v-if="shop.webSite"><a :href="shop.webSite" rel="noopener" target="_blank">{{ shop.webSite }}</a></p>
        </div>
      </li>
    </ul>
    <p class="shops__seller">Продавец: {{ seller.name }}, ИНН {{ seller.inn }}, ОГРН {{ seller.ogrn }}, {{ seller.address }}</p>
  </section>
</template>

<style lang="scss" scoped>
.shops {
  padding: 0 15px;

  &__title {
    font-size: 17px;
    margin-bottom: 30px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 540px));
    gap: 30px;
  }

  &__seller {
    margin-top: 30px;
    font-size: 14px;
  }
}

.shop {
  &__photos {
    display: grid;
    gap: 15px;
    margin-bottom: 15px;
  }

  &__name {
    margin-bottom: 8px;
  }

  &__info p {
    margin-bottom: 4px;
  }
}

@media (max-width: 1160px) {
  .shops__list {
    grid-template-columns: minmax(0, 540px);
  }
}
</style>
