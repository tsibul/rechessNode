<template>
  <footer class="footer">
    <div>
      <p class="">ProEcoPen × Yaroslav Rassadin</p>
      <p class=""><a href="https://wa.me/79266026441">+7 926 602 64 41</a></p>
      <p><a href="mailto:info@rechess.ru">info@rechess.ru</a></p>
      <p class="">@rechess.project</p>
    </div>
    <div>
      <p class="">О Компании</p>
      <p class="">Политика Конфиденциальности</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Header',
  ssg: true
})
</script>

<style lang="scss" scoped>
@use '../../styles/vars' as *;

* {
  font-size: 14px;
  line-height: 19px;
}

.footer {
  display: flex;
  gap: 30px;
  width: 67%;
  margin-bottom: 30px;
  padding: 0 15px;

  & div {
    width: 540px;
    display: flex;
    flex-direction: column;
  }
}

@media(max-width: 1160px) {
  .footer {
    flex-direction: column;
    gap: 15px;

  }
}

@media(max-width: 660px) {
  .footer {
    margin-bottom: 15px;

    & div {
      margin-bottom: 0;
    }
  }
}
</style>
