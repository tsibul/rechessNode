<template>
  <div class="shop-content">
    <div class="shop-header">
      <h1>Shop</h1>
      <div class="account-link">
        <router-link to="/cabinet" class="cabinet-link">
          <span class="icon">👤</span>
          My Account
        </router-link>
      </div>
    </div>
    
    <div class="products-grid">
      <!-- Place for products grid -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<style scoped lang="scss">
.shop-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin: 0;
  }
}

.cabinet-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  transition: background 0.2s;

  &:hover {
    background: #e5e5e5;
  }

  .icon {
    font-size: 1.2rem;
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
}
</style> 