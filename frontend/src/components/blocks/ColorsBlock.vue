<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getProduct } from '@/data/content'
import { useCartStore } from '@/store/cart'
import PhotoItem from './PhotoItem.vue'

const pairs = getProduct().pairs
const cart = useCartStore()
const busy = ref(0)
const failed = ref<string | null>(null)

onMounted(() => { cart.load().catch(() => {}) })

const lines = (name: string) => name.split(' / ')
const inCart = (id: number) => cart.items.find((l) => l.item_id === id)?.quantity ?? 0

async function change(id: number, delta: 1 | -1) {
  if (busy.value) return
  busy.value = id
  failed.value = null
  try {
    const q = inCart(id) + delta
    if (q <= 0) await cart.remove(id)
    else if (delta === 1 && q === 1) await cart.add(id)
    else await cart.setQuantity(id, q)
  } catch (e) {
    failed.value = (e as { status?: number }).status === 429
      ? 'Слишком много запросов, попробуйте через минуту.'
      : 'Не удалось изменить корзину. Попробуйте ещё раз.'
  } finally {
    busy.value = 0
  }
}
</script>

<template>
  <section class="colors" data-testid="colors">
    <article v-for="pair in pairs" :key="pair.id" class="card">
      <span v-if="pair.id === 2" class="card__arrow" aria-hidden="true">→</span>
      <PhotoItem v-for="(p, i) in pair.photos" :key="i" :photo="p" />
      <p class="card__name">
        <span v-for="(l, i) in lines(pair.name)" :key="i" class="card__line">{{ l }}</span>
      </p>
      <p class="card__actions">
        <button type="button" :disabled="busy === pair.id" @click="change(pair.id, 1)">
          + добавить<template v-if="inCart(pair.id)"> ({{ inCart(pair.id) }})</template>
        </button>
        <button v-if="inCart(pair.id)" type="button" :disabled="busy === pair.id" @click="change(pair.id, -1)">– удалить</button>
      </p>
    </article>
    <p v-if="failed" class="colors__error" role="alert">{{ failed }}</p>
  </section>
</template>

<style lang="scss" scoped>
.colors {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 540px));
  column-gap: 30px;
  row-gap: 30px;
  padding: 0 15px;
  margin-top: 19px;
}

.card {
  position: relative;

  // Figma 2724:75: one small arrow on the right edge of the second photo, 8 px from the edge.
  &__arrow {
    position: absolute;
    top: 189px;
    right: 8px;
    line-height: 19px;
  }

  &__line {
    display: block;
  }

  &__name {
    margin-top: 8px;
  }

  &__actions {
    display: flex;
    gap: 15px;
    margin-top: 8px;

    button {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      cursor: pointer;

      &:hover { text-decoration: underline; }
    }
  }
}

.colors__error {
  grid-column: 1 / -1;
}

@media (max-width: 1160px) {
  .card__arrow {
    display: none;
  }

  .colors {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 20px;
  }
}

@media (max-width: 660px) {
  .colors {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 15px;
  }
}
</style>
