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

// Mouse drag for the slide strip (touch and trackpad scroll natively).
let drag: { el: HTMLElement; x: number; left: number } | null = null
function dragStart(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  drag = { el, x: e.clientX, left: el.scrollLeft }
  el.classList.add('is-dragging')
  el.setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) {
  if (drag) drag.el.scrollLeft = drag.left - (e.clientX - drag.x)
}
function dragEnd(e: PointerEvent) {
  if (!drag) return
  const el = drag.el
  drag = null
  el.releasePointerCapture(e.pointerId)
  el.classList.remove('is-dragging')
}

function nextSlide(e: MouseEvent) {
  const strip = (e.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>('.card__slides')
  if (!strip) return
  const step = (strip.children[0] as HTMLElement).offsetWidth + 15
  strip.scrollBy({ left: strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4 ? -strip.scrollLeft : step, behavior: 'smooth' })
}

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
      <div class="card__media">
      <div class="card__slides" :class="{ 'card__slides--single': pair.photos.length < 2 }" data-testid="pair-slides" tabindex="0" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd" :aria-label="`Фото: ${pair.name}`">
        <div v-for="(p, i) in pair.photos" :key="i" class="card__slide">
          <PhotoItem :photo="p" />
        </div>
      </div>
      <button v-if="pair.photos.length > 1" type="button" class="card__next" aria-label="Следующее фото" data-testid="pair-next" @click="nextSlide">→</button>
      </div>
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

  &__slides {
    display: flex;
    gap: 15px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { display: none; }
    &.is-dragging { scroll-snap-type: none; cursor: grabbing; user-select: none; }
  }

  &__slide :deep(img) { -webkit-user-drag: none; user-select: none; }

  &__slide {
    flex: 0 0 88%;
    min-width: 0;
    scroll-snap-align: start;
  }

  &__slides--single &__slide { flex-basis: 100%; }

  &__media { position: relative; }

  &__next {
    display: none;
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 36px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    z-index: 1;

    @media (hover: hover) and (min-width: 661px) { display: flex; }
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
