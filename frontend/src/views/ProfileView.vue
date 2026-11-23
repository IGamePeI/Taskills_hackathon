<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import type { UpdateProfileData, UserRole } from '../types/auth'

const authStore = useAuthStore()

// состояние редактирования
const isEditing = ref(false)
const isSaving = ref(false)
const saveError = ref('')

// поля формы
const username = ref('')
const email = ref('')
const role = ref<UserRole>('student')

// первая буква имени для аватара
const userInitial = computed(() => {
  return authStore.user?.username.trim().charAt(0).toUpperCase() || '?'
})

// название роли для отображения
const roleLabel = computed(() => {
  const roles: Record<UserRole, string> = {
    student: 'Ученик',
    expert: 'Эксперт',
  }

  return authStore.user ? roles[authStore.user.role] : 'Не указана'
})

// форматируем дату регистрации
const registrationDate = computed(() => {
  const date = authStore.user?.created_at

  if (!date) return 'Не указана'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Не указана'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
})

// открытие формы редактирования
function startEditing() {
  if (!authStore.user) return

  username.value = authStore.user.username
  email.value = authStore.user.email
  role.value = authStore.user.role
  saveError.value = ''
  isEditing.value = true
}

// отмена редактирования
function cancelEditing() {
  if (isSaving.value) return

  isEditing.value = false
  saveError.value = ''
}

// сохранение изменений
async function saveProfile() {
  if (!authStore.user) return

  saveError.value = ''

  const data: UpdateProfileData = {
    username: username.value.trim(),
    email: email.value.trim(),
    role: role.value,
  }

  if (!data.username || !data.email) {
    saveError.value = 'Заполните все поля'
    return
  }

  try {
    isSaving.value = true

    await authStore.updateProfile(data)

    isEditing.value = false
  } catch (error: unknown) {
    saveError.value =
      error instanceof Error
        ? error.message
        : 'Не удалось сохранить изменения. Попробуйте ещё раз.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <main class="profile-page">
    <div class="profile-container">
      <!-- Заголовок -->
      <header class="profile-heading">
        <div class="profile-title">
          <span class="section-number">01 / PROFILE</span>

          <h1>Ваше <span>пространство</span></h1>

          <p>
            Управляйте аккаунтом, просматривайте информацию о себе и продолжайте открывать новые
            инструкции
          </p>
        </div>
      </header>

      <!-- Информация о пользователе -->
      <section v-if="authStore.user" class="profile-content">
        <!-- Основная карточка -->
        <article class="profile-main-card">
          <div class="card-top">
            <span class="card-label">USER INFORMATION</span>
            <span class="card-number">№ {{ authStore.user.id }}</span>
          </div>

          <div class="profile-user">
            <div class="profile-avatar">
              {{ userInitial }}
            </div>

            <div class="profile-user-info">
              <span class="user-role">{{ roleLabel }}</span>
              <h2>{{ authStore.user.username }}</h2>
              <p>{{ authStore.user.email }}</p>
            </div>
          </div>

          <div class="profile-divider"></div>

          <div class="profile-card-footer">
            <span>MEMBER OF GUIDE LIST</span>
            <span>EST. 2026</span>
          </div>
        </article>

        <!-- Данные аккаунта -->
        <section class="profile-details">
          <div class="details-heading">
            <h2>Данные аккаунта</h2>

            <button
              v-if="!isEditing"
              class="profile-edit-button"
              type="button"
              @click="startEditing"
            >
              Редактировать
            </button>
          </div>

          <!-- Режим просмотра -->
          <div v-if="!isEditing" class="details-list">
            <div class="detail-item">
              <span class="detail-label">Имя пользователя</span>
              <span class="detail-value">{{ authStore.user.username }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Электронная почта</span>
              <span class="detail-value">{{ authStore.user.email }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Роль в системе</span>
              <span class="detail-value">{{ roleLabel }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Дата регистрации</span>
              <span class="detail-value">{{ registrationDate }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Идентификатор</span>
              <span class="detail-value detail-id">#{{ authStore.user.id }}</span>
            </div>
          </div>

          <!-- Режим редактирования -->
          <form v-else class="profile-edit-form" @submit.prevent="saveProfile">
            <label class="profile-form-field">
              <span>Имя пользователя</span>
              <input
                v-model="username"
                type="text"
                placeholder="Введите имя пользователя"
                required
                maxlength="50"
              />
            </label>

            <label class="profile-form-field">
              <span>Электронная почта</span>
              <input
                v-model="email"
                type="email"
                placeholder="Введите электронную почту"
                required
              />
            </label>

            <label class="profile-form-field">
              <span>Роль в системе</span>
              <select v-model="role">
                <option value="student">Ученик</option>
                <option value="expert">Эксперт</option>
              </select>
            </label>

            <p v-if="saveError" class="profile-form-error">
              {{ saveError }}
            </p>

            <div class="profile-form-actions">
              <button
                class="profile-save-button"
                type="submit"
                :disabled="isSaving"
              >
                {{ isSaving ? 'Сохранение...' : 'Сохранить изменения' }}
              </button>

              <button
                class="profile-cancel-button"
                type="button"
                :disabled="isSaving"
                @click="cancelEditing"
              >
                Отмена
              </button>
            </div>
          </form>
        </section>

        <!-- Переход к собственным инструкциям — только для эксперта -->
        <RouterLink
          v-if="authStore.user.role === 'expert'"
          :to="{ name: 'my-instructions' }"
          class="profile-instructions-link"
        >
          <div class="profile-instructions-info">
            <span class="section-number">02 / MY COLLECTION</span>

            <h2>Мои инструкции</h2>

            <p>
              Просматривайте созданные вами руководства и управляйте собственной коллекцией
            </p>
          </div>

          <div class="profile-instructions-action">
            <span>Открыть коллекцию</span>
          </div>
        </RouterLink>
      </section>

      <!-- Состояние загрузки -->
      <section v-else class="profile-loading">
        <span class="section-number">LOADING / 001</span>
        <p>Загружаем информацию об аккаунте...</p>
      </section>
    </div>
  </main>
</template>

<style scoped lang="scss" src="../assets/styles/profile.scss"></style>
