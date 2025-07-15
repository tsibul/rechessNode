<template>
  <div class="modal__overlay" @click="closeModal">
    <div class="modal__content" @click.stop>
      <!-- Хедер -->
      <div class="modal__header">
        <div class="modal__header-left">
          <h3 class="modal__title">{{ schema?.title || '' }}</h3>
          <label class="modal__checkbox">
            <input type="checkbox" v-model="hideDeleted" />
            <span>Скрыть удаленные</span>
          </label>
        </div>
        <div class="modal__header-right">
          <div class="modal__search">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Поиск..."
              class="modal__search-input"
            />
            <button @click="performSearch" class="modal__button">
              Поиск
            </button>
          </div>
          <button @click="addItem" class="modal__button">
            Добавить
          </button>
        </div>
        <button @click="closeModal" class="modal__close">&times;</button>
      </div>

      <!-- Шапка таблицы -->
      <div 
        class="modal__table-header"
        :style="{ 
          gridTemplateColumns: schema ? 
            schema.columns.map(col => col.width).join(' ') + ' 200px' : 
            '1fr 1fr 1fr 1fr 200px' 
        }"
      >
        <div 
          v-for="column in schema?.columns || []" 
          :key="column.key"
          class="modal__table-column"
        >
          {{ column.label }}
        </div>
        <div class="modal__table-actions">Действия</div>
      </div>

      <!-- Контент таблицы -->
      <div class="modal__body">
        <div class="modal__table-content">
          <div 
            v-for="item in filteredItems" 
            :key="item.id"
            class="modal__table-row"
            :style="{ 
              gridTemplateColumns: schema ? 
                schema.columns.map(col => col.width).join(' ') + ' 200px' : 
                '1fr 1fr 1fr 1fr 200px' 
            }"
          >
            <div 
              v-for="column in schema?.columns || []" 
              :key="column.key"
              class="modal__table-cell"
            >
              <!-- Boolean поле -->
              <input 
                v-if="column.type === 'boolean'"
                type="checkbox" 
                :checked="item[column.key]" 
                disabled
                class="modal__checkbox-display"
              />
              
              <!-- Photo поле -->
              <div v-else-if="column.type === 'photo'" class="modal__photo-cell">
                <img 
                  v-if="item[column.key]" 
                  :src="item[column.key]" 
                  :alt="item[column.key]"
                  class="modal__photo-thumbnail"
                />
                <span class="modal__photo-filename">{{ item[column.key] }}</span>
              </div>
              
              <!-- Foreign key поле -->
              <span v-else-if="column.type === 'foreign'">
                {{ item[column.key] }}
              </span>
              
              <!-- Обычное текстовое поле -->
              <span v-else>{{ item[column.key] }}</span>
            </div>
            <div class="modal__table-actions">
              <button @click="editItem(item)" class="modal__action-button modal__action-button--edit">
                Изменить
              </button>
              <button @click="deleteItem(item)" class="modal__action-button modal__action-button--delete">
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tableSchemas, type TableSchema } from '../data/tableSchemas'

interface TableItem {
  id: number
  [key: string]: any
}

interface Props {
  referenceName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const hideDeleted = ref(true)
const searchQuery = ref('')
const items = ref<TableItem[]>([])
const loading = ref(false)

const schema = computed(() => {
  return tableSchemas[props.referenceName]
})

const filteredItems = computed(() => {
  let filtered = items.value
  
  // Фильтрация по поиску
  if (searchQuery.value) {
    filtered = filtered.filter(item => 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    )
  }
  
  // Фильтрация удаленных
  if (hideDeleted.value) {
    filtered = filtered.filter(item => !item.deleted)
  }
  
  return filtered
})

const closeModal = () => {
  emit('close')
}

const performSearch = () => {
  // Поиск уже работает через computed filteredItems
  console.log('Поиск:', searchQuery.value)
}

const addItem = () => {
  console.log('Добавить элемент в', props.referenceName)
  // Здесь будет логика добавления
}

const editItem = (item: TableItem) => {
  console.log('Редактировать элемент', item, 'в', props.referenceName)
  // Здесь будет логика редактирования
}

const deleteItem = (item: TableItem) => {
  console.log('Удалить элемент', item, 'из', props.referenceName)
  // Здесь будет логика удаления
}

const loadData = async () => {
  loading.value = true
  try {
    // Здесь будет запрос к бэкенду
    // const response = await fetch(`/api/${props.referenceName}`)
    // items.value = await response.json()
    
    // Временные моковые данные
    items.value = [
      { 
        id: 1, 
        name: 'Тестовый элемент 1', 
        priority: 1,
        photo: '/images/test1.jpg',
        deleted: false 
      },
      { 
        id: 2, 
        name: 'Тестовый элемент 2', 
        priority: 2,
        photo: '/images/test2.jpg',
        deleted: false 
      },
      { 
        id: 3, 
        name: 'Удаленный элемент', 
        priority: 3,
        photo: '/images/deleted.jpg',
        deleted: true 
      }
    ]
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
@use '../../../styles/vars' as *;
@use '../../../styles/mixins' as *;

.modal {
  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba($colorPrimary900, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  &__content {
    background: $colorNeutral100;
    border-radius: 8px;
    width: 90vw;
    max-width: 1200px;
    height: 80vh;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid $colorPrimary500;
    gap: 1rem;
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: $colorPrimary900;
  }

  &__checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: $colorPrimary900;
    cursor: pointer;
  }

  &__search {
    display: flex;
    gap: 0.5rem;
  }

  &__search-input {
    padding: 0.5rem;
    border: 1px solid $colorPrimary500;
    border-radius: 4px;
    font-size: 0.9rem;
    min-width: 200px;
  }

  &__button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background: $colorPrimary500;
    color: $colorNeutral100;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;

    &:hover {
      background: $colorPrimary900;
    }
  }

  &__close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: $colorPrimary500;
      border-radius: 4px;
    }
  }

  &__table-header {
    display: grid;
    background: $colorPrimary500;
    color: $colorNeutral100;
    font-weight: 600;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid $colorPrimary900;
  }

  &__body {
    flex: 1;
    overflow: auto;
  }

  &__table-content {
    display: flex;
    flex-direction: column;
  }

  &__table-row {
    display: grid;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid $colorPrimary500;
    align-items: center;

    &:hover {
      background: rgba($colorPrimary500, 0.1);
    }

    &:nth-child(even) {
      background: rgba($colorPrimary500, 0.05);
    }
  }

  &__action-button {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
    margin-right: 0.5rem;
    transition: background-color 0.2s;

    &--edit {
      background: $colorPrimary500;
      color: $colorNeutral100;

      &:hover {
        background: $colorPrimary900;
      }
    }

    &--delete {
      background: $colorPrimary900;
      color: $colorNeutral100;

      &:hover {
        background: $colorPrimary500;
      }
    }
  }
}
</style> 