<template>
  <div class="index-content">
    <section class="hero">
      <h1>Welcome to ReChess</h1>
      <p class="subtitle">Your Ultimate Chess Equipment Store</p>
    </section>

    <section class="features">
      <div class="feature">
        <h2>Premium Chess Sets</h2>
        <p>Browse our collection of handcrafted chess sets</p>
      </div>
      <div class="feature">
        <h2>Professional Equipment</h2>
        <p>Tournament-grade chess clocks and boards</p>
      </div>
      <div class="feature">
        <h2>Learning Materials</h2>
        <p>Books and courses for all skill levels</p>
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
.index-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 4rem 0;

  h1 {
    font-size: 3rem;
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  .subtitle {
    font-size: 1.5rem;
    color: #666;
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem 0;

  .feature {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
    transition: transform 0.2s;

    &:hover {
      transform: translateY(-5px);
    }

    h2 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    p {
      color: #666;
    }
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 2rem 0;

    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1.2rem;
    }
  }

  .features {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
