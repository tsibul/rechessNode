<!--
/**
 * Shared footer component used across all pages.
 * @component Footer
 */
-->
<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <h3>About Us</h3>
          <p>ReChess - Your Ultimate Chess Equipment Store</p>
        </div>
        
        <div class="footer-section">
          <h3>Contact</h3>
          <p>Email: info@rechess.com</p>
          <p>Phone: +1 234 567 8900</p>
        </div>
        
        <div class="footer-section">
          <h3>Follow Us</h3>
          <div class="social-links">
            <a href="#" target="_blank" rel="noopener">Twitter</a>
            <a href="#" target="_blank" rel="noopener">Facebook</a>
            <a href="#" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2024 ReChess. All rights reserved.</p>
      </div>
    </div>

    <!-- Слот для клиентских компонентов -->
    <slot name="client-components" />
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  background-color: #1a202c;
  color: white;
  padding: 3rem 0 1rem;
  margin-top: auto;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section {
  h3 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  p {
    margin: 0.5rem 0;
    color: #cbd5e0;
  }
}

.social-links {
  display: flex;
  gap: 1rem;

  a {
    color: #cbd5e0;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: white;
    }
  }
}

.footer-bottom {
  border-top: 1px solid #2d3748;
  padding-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #cbd5e0;
}
</style> 