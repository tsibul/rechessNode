<template>
  <div class="container">
    <section class="images">
      <div class="images__block">
<!--        <img src="./img/1.jpg" alt="Дизайнерские шахматы reChess - фото 1" loading="lazy">-->
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'IndexContent',
  ssg: true
})
</script>

<style scoped lang="scss">
@use '../../../../styles/vars' as *;
@use '../../../../styles/mixins' as *;

.images {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  padding: 0 15px 0 15px;

  &__block {
    width: 540px;
    height: 540px;
    display: flex;
    align-items: flex-start;

    & img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }
}

@media(max-width: 660px) {
  .images {
    padding: 0 0 0 15px;
    //gap: 8px;

    &__block {
      height: 370px;
      width: 370px;
    }
  }
}

</style>

