// Lets TypeDoc resolve `import './X.vue'` (TypeDoc does not read Vue files; components are documented by vue-docgen).
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
