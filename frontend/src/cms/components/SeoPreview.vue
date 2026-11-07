<script setup lang="ts">
import { computed } from 'vue'
import { photoUrl, seoPreview, type FormValues } from '../logic'
import { useSiteUrl } from '../siteUrl'

/** Preview of how a page looks in search results and social networks. */
defineOptions({ name: 'SeoPreview' })

const props = defineProps<{
  /** Current SEO form values. */
  values: FormValues
  /** Page slugs by page id. */
  pageSlugs: Record<number, string>
}>()

const siteUrl = useSiteUrl()
const preview = computed(() => seoPreview(props.values, siteUrl.value, props.pageSlugs[props.values.page_id] ?? ''))
</script>

<template>
  <section class="cms-preview">
    <h3 class="cms-preview__title">Предпросмотр</h3>
    <div class="cms-snippet">
      <div class="cms-snippet__url">{{ preview.url }}</div>
      <div class="cms-snippet__title">{{ preview.title || 'Заголовок страницы' }}</div>
      <div class="cms-snippet__desc">{{ preview.description || 'Описание страницы' }}</div>
    </div>
    <div class="cms-og">
      <img v-if="preview.ogImage" :src="photoUrl(preview.ogImage)!" alt="" class="cms-og__img" />
      <div v-else class="cms-og__img cms-og__img--empty">нет картинки</div>
      <div class="cms-og__body">
        <div class="cms-og__title">{{ preview.ogTitle }}</div>
        <div class="cms-og__desc">{{ preview.ogDescription }}</div>
      </div>
    </div>
    <ul v-if="preview.warnings.length" class="cms-warn">
      <li v-for="w in preview.warnings" :key="w">{{ w }}</li>
    </ul>
  </section>
</template>
