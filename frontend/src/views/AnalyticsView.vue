<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

import { progressApi } from '../api/progress.api'
import type { InstructionAnalytics } from '../types/progress'

const route = useRoute()

const analytics = ref<InstructionAnalytics | null>(null)

const isLoading = ref(false)
const error = ref<string | null>(null)

// ID инструкции из URL
const instructionId = computed(() => Number(route.params.id))

// максимальное количество пользователей,
// дошедших до шага
const maxReached = computed(() => {
  if (!analytics.value?.steps_stats.length) return 0

  return Math.max(
    ...analytics.value.steps_stats.map((step) => step.users_reached),
    1,
  )
})

// процент дошедших до шага
function getReachedWidth(value: number): number {
  return Math.min((value / maxReached.value) * 100, 100)
}

// процент остановившихся относительно тех,
// кто дошёл до шага
function getDroppedWidth(value: number, reached: number): number {
  if (!reached) return 0

  return Math.min((value / reached) * 100, 100)
}

// загрузка аналитики
async function fetchAnalytics() {
  analytics.value = null
  error.value = null

  if (!Number.isInteger(instructionId.value) || instructionId.value <= 0) {
    error.value = 'Некорректный идентификатор инструкции'
    return
  }

  isLoading.value = true

  try {
    analytics.value = await progressApi.getAnalytics(instructionId.value)
  } catch (err) {
    console.error('Ошибка загрузки аналитики:', err)

    error.value = 'Не удалось загрузить аналитику инструкции'
  } finally {
    isLoading.value = false
  }
}

// загружаем данные при открытии страницы
// и при изменении ID инструкции
watch(
  () => route.params.id,
  () => {
    fetchAnalytics()
  },
  { immediate: true },
)
</script>

<template>
  <main class="analytics-page">
    <div class="analytics-container">

      <!-- Заголовок -->
      <header class="analytics-heading">
        <span class="section-number">01 / ANALYTICS</span>

        <h1>
          Аналитика
          <span>инструкции</span>
        </h1>

        <p>
          Изучайте поведение пользователей, оценивайте
          эффективность руководства и находите проблемные шаги.
        </p>

        <RouterLink
          :to="{ name: 'my-instructions' }"
          class="analytics-back"
        >
          ← Мои инструкции
        </RouterLink>
      </header>

      <!-- Загрузка -->
      <section
        v-if="isLoading"
        class="analytics-state"
        aria-live="polite"
      >
        <span class="section-number">02 / LOADING</span>

        <div class="analytics-loader"></div>

        <h2>Загружаем статистику</h2>

        <p>Получаем данные с сервера...</p>
      </section>

      <!-- Ошибка -->
      <section
        v-else-if="error"
        class="analytics-state"
        aria-live="polite"
      >
        <span class="section-number">02 / ERROR</span>

        <h2>Не удалось загрузить данные</h2>

        <p>{{ error }}</p>

        <button
          class="analytics-retry"
          type="button"
          @click="fetchAnalytics"
        >
          Попробовать снова ↗
        </button>
      </section>

      <!-- Нет статистики -->
      <section
        v-else-if="analytics && analytics.total_started === 0"
        class="analytics-state"
      >
        <span class="section-number">02 / EMPTY</span>

        <h2>Пока нет статистики<span>.</span></h2>

        <p>
          Пользователи ещё не начали прохождение
          этой инструкции.
        </p>
      </section>

      <!-- Аналитика -->
      <template v-else-if="analytics">

        <!-- Общие показатели -->
        <section class="analytics-overview">
          <div class="analytics-section-heading">
            <span class="section-number">02 / OVERVIEW</span>
            <h2>Общая статистика</h2>
          </div>

          <div class="analytics-cards">

            <article class="analytics-card">
              <span class="analytics-card-label">
                ВСЕГО НАЧАЛИ
              </span>

              <strong>
                {{ analytics.total_started }}
              </strong>

              <span class="analytics-card-description">
                Начатых прохождений
              </span>
            </article>

            <article class="analytics-card">
              <span class="analytics-card-label">
                ЗАВЕРШИЛИ
              </span>

              <strong>
                {{ analytics.total_completed }}
              </strong>

              <span class="analytics-card-description">
                Успешных прохождений
              </span>
            </article>

            <article class="analytics-card analytics-card-accent">
              <span class="analytics-card-label">
                ПРОЦЕНТ ЗАВЕРШЕНИЯ
              </span>

              <strong>
                {{ analytics.completion_rate }}%
              </strong>

              <span class="analytics-card-description">
                От общего количества начатых
              </span>
            </article>

          </div>
        </section>

        <!-- Статистика шагов -->
        <section class="analytics-steps">
          <div class="analytics-section-heading">
            <span class="section-number">03 / STEP ANALYTICS</span>
            <h2>Статистика по шагам</h2>

            <p>
              Здесь можно определить, на каких этапах
              пользователи чаще всего прекращают прохождение.
            </p>
          </div>

          <div class="analytics-step-list">

            <article
              v-for="step in analytics.steps_stats"
              :key="step.step_number"
              class="analytics-step-card"
            >

              <div class="analytics-step-heading">
                <div>
                  <span class="analytics-step-number">
                    STEP / {{ String(step.step_number).padStart(2, '0') }}
                  </span>

                  <h3>{{ step.step_title }}</h3>
                </div>
              </div>

              <!-- Дошли до шага -->
              <div class="analytics-metric">
                <div class="analytics-metric-heading">
                  <span>Дошли до шага</span>

                  <strong>{{ step.users_reached }}</strong>
                </div>

                <div class="analytics-progress">
                  <div
                    class="analytics-progress-fill"
                    :style="{
                      width: `${getReachedWidth(step.users_reached)}%`,
                    }"
                  ></div>
                </div>
              </div>

              <!-- Остановились -->
              <div class="analytics-metric">
                <div class="analytics-metric-heading">
                  <span>Остановились на этом шаге</span>

                  <strong class="analytics-danger">
                    {{ step.users_dropped_here }}
                  </strong>
                </div>

                <div class="analytics-progress">
                  <div
                    class="analytics-progress-fill analytics-progress-danger"
                    :style="{
                      width: `${getDroppedWidth(
                        step.users_dropped_here,
                        step.users_reached,
                      )}%`,
                    }"
                  ></div>
                </div>
              </div>

              <!-- Отрицательные оценки -->
              <div class="analytics-step-footer">
                <span>Отрицательные оценки</span>

                <strong>{{ step.dislikes_count }}</strong>
              </div>

            </article>

          </div>
        </section>

        <!-- Информация -->
        <footer class="analytics-footer">
          <span>GUIDE LIST / ANALYTICS</span>

          <span>
            INSTRUCTION № {{ analytics.instruction_id }}
          </span>
        </footer>

      </template>

    </div>
  </main>
</template>

<style lang="scss" src="../assets/styles/analytics.scss"></style>