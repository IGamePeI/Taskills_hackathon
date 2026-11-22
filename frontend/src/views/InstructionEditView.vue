<script setup lang="ts">
import { ref, watch, type Directive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { instructionsApi } from '../api/instructions.api'
import { stepsApi } from '../api/steps.api'
import { useInstructionsStore } from '../stores/instructions'
import { useAuthStore } from '../stores/auth'

import type { Instruction } from '../types/instruction'

import { getStepsLabel } from '../components/declension'

interface StepDraft {
  id: number | null
  step_number: number
  title: string
  content: string
  image_url: string | null
}

const route = useRoute()
const router = useRouter()

const instructionsStore = useInstructionsStore()
const authStore = useAuthStore()

const instruction = ref<Instruction | null>(null)
const steps = ref<StepDraft[]>([])
const originalStepIds = ref<number[]>([])

const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const errorMessage = ref<string | null>(null)

// подстраивает высоту textarea под содержимое
const vAutoResize: Directive<HTMLTextAreaElement> = {
  mounted(element) {
    resizeTextarea(element)
  },

  updated(element) {
    resizeTextarea(element)
  },
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

function createEmptyStep(stepNumber: number): StepDraft {
  return {
    id: null,
    step_number: stepNumber,
    title: '',
    content: '',
    image_url: null,
  }
}

// загружаем инструкцию
async function loadInstruction() {
  const id = Number(route.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    errorMessage.value = 'Некорректный номер инструкции'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = null

  try {
    const data = await instructionsApi.getById(id)

    // проверяем, что инструкция принадлежит текущему пользователю
    if (data.author.id !== authStore.user?.id) {
      errorMessage.value = 'У вас нет доступа к редактированию этой инструкции'
      return
    }

    instruction.value = data

    steps.value = data.steps.map((step) => ({
      id: step.id,
      step_number: step.step_number,
      title: step.title,
      content: step.content,
      image_url: step.image_url,
    }))

    originalStepIds.value = data.steps.map((step) => step.id)
  } catch (error) {
    console.error('Ошибка загрузки инструкции:', error)
    errorMessage.value = 'Не удалось загрузить инструкцию'
  } finally {
    isLoading.value = false
  }
}

// добавляем шаг
function addStep() {
  steps.value.push(createEmptyStep(steps.value.length + 1))
}

// удаляем шаг из формы
function removeStep(index: number) {
  if (steps.value.length === 1) {
    errorMessage.value = 'В инструкции должен остаться хотя бы один шаг'
    return
  }

  steps.value.splice(index, 1)
  updateStepNumbers()
}

// пересчитываем номера шагов
function updateStepNumbers() {
  steps.value.forEach((step, index) => {
    step.step_number = index + 1
  })
}

// сохраняем изменения
async function saveChanges() {
  errorMessage.value = null

  const hasEmptySteps = steps.value.some(
    (step) => !step.title.trim() || !step.content.trim(),
  )

  if (hasEmptySteps) {
    errorMessage.value = 'Заполните название и описание каждого шага'
    return
  }

  if (!steps.value.length) {
    errorMessage.value = 'Добавьте хотя бы один шаг'
    return
  }

  isSaving.value = true

  try {
    const currentIds = steps.value
      .filter((step) => step.id !== null)
      .map((step) => step.id as number)

    // удаляем шаги, которые убрали из формы
    const removedIds = originalStepIds.value.filter(
      (id) => !currentIds.includes(id),
    )

    for (const id of removedIds) {
      await stepsApi.delete(id)
    }

    // обновляем существующие шаги и создаём новые
    for (const step of steps.value) {
      const data = {
        step_number: step.step_number,
        title: step.title.trim(),
        content: step.content.trim(),
        image_url: step.image_url?.trim() || null,
      }

      if (step.id !== null) {
        await stepsApi.update(step.id, data)
      } else {
        await stepsApi.create(instruction.value!.id, data)
      }
    }

    await instructionsStore.fetchInstructions()

    await router.push({
      name: 'instruction-preview',
      params: { id: instruction.value!.id },
    })
  } catch (error) {
    console.error('Ошибка сохранения инструкции:', error)
    errorMessage.value = 'Не удалось сохранить изменения. Попробуйте ещё раз'
  } finally {
    isSaving.value = false
  }
}

// удаляем всю инструкцию
async function deleteInstruction() {
  if (!instruction.value) return

  const confirmed = window.confirm(
    'Вы действительно хотите удалить эту инструкцию? Это действие нельзя отменить.',
  )

  if (!confirmed) return

  isDeleting.value = true
  errorMessage.value = null

  try {
    await instructionsStore.deleteInstruction(instruction.value.id)

    await router.push({ name: 'my-instructions' })
  } catch (error) {
    console.error('Ошибка удаления инструкции:', error)
    errorMessage.value = 'Не удалось удалить инструкцию'
  } finally {
    isDeleting.value = false
  }
}

watch(() => route.params.id, loadInstruction, { immediate: true })
</script>

<template>
  <main class="instruction-edit-page">
    <div class="edit-top-background">
      <div class="edit-container">
        <div class="edit-intro">
          <span class="edit-eyebrow">01 / AUTHOR WORKSPACE</span>

          <h1>
            Редактирование
            <span>инструкции</span>
          </h1>

          <p>Измени последовательность шагов или удали инструкцию</p>
        </div>
      </div>
    </div>

    <div class="edit-container">
      <section v-if="isLoading" class="edit-state">
        <h2>Загружаем инструкцию...</h2>
      </section>

      <section v-else-if="errorMessage && !instruction" class="edit-state">
        <h2>Не удалось открыть редактор</h2>
        <p>{{ errorMessage }}</p>

        <RouterLink to="/my-instructions" class="edit-back-link">
          Вернуться к моим инструкциям
        </RouterLink>
      </section>

      <form v-else-if="instruction" class="edit-form" @submit.prevent="saveChanges">
        <section class="edit-information">
          <span class="edit-section-index">02 / INFORMATION</span>
          <h2>{{ instruction.title }}</h2>

          <p>{{ instruction.description }}</p>

          <div class="edit-category">
            <span>КАТЕГОРИЯ</span>
            <strong>{{ instruction.category }}</strong>
          </div>

          <p class="edit-note">
            Название, описание и категория доступны только для просмотра:
            соответствующие методы пока отсутствуют в API
          </p>
        </section>

        <section class="edit-steps-section">
          <div class="edit-section-heading">
            <div>
              <span class="edit-section-index">03 / STEP BY STEP</span>
              <h2>Шаги инструкции</h2>
            </div>

            <span class="edit-steps-count">
              {{ steps.length }} {{ getStepsLabel(steps.length).toUpperCase() }}
            </span>
          </div>

          <div class="edit-steps-list">
            <article v-for="(step, index) in steps" :key="step.id ?? `new-${index}`" class="edit-step">
              <div class="edit-step-heading">
                <div class="edit-step-number">
                  {{ String(index + 1).padStart(2, '0') }}
                </div>

                <div class="edit-step-title">
                  <span>STEP {{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>Шаг {{ index + 1 }}</strong>
                </div>

                <button
                  v-if="steps.length > 1"
                  class="edit-remove-step"
                  type="button"
                  @click="removeStep(index)"
                >
                  Удалить<span>×</span>
                </button>
              </div>

              <div class="edit-fields">
                <label class="edit-field">
                  <span>Название шага <i>*</i></span>
                  <input
                    v-model="step.title"
                    type="text"
                    maxlength="150"
                    placeholder="Например, подготовьте необходимые инструменты"
                    required
                  />
                </label>

                <label class="edit-field">
                  <span>Описание шага <i>*</i></span>
                  <textarea
                    v-model="step.content"
                    v-auto-resize
                    rows="4"
                    placeholder="Подробно объясните, что нужно сделать..."
                    required
                  ></textarea>
                </label>

                <label class="edit-field">
                  <span>Ссылка на изображение</span>
                  <input
                    v-model="step.image_url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                  />
                  <small>Необязательное поле. Укажите прямую ссылку на изображение</small>
                </label>
              </div>
            </article>
          </div>

          <button
            type="button"
            class="edit-add-step"
            @click="addStep"
          >
            + Добавить шаг
          </button>
        </section>

        <p v-if="errorMessage" class="edit-error" role="alert">
          {{ errorMessage }}
        </p>

        <section class="edit-actions">
          <button
            type="button"
            class="edit-delete-button"
            :disabled="isDeleting || isSaving"
            @click="deleteInstruction"
          >
            {{ isDeleting ? 'Удаляем...' : 'Удалить инструкцию' }}
          </button>

          <button
            type="submit"
            class="edit-save-button"
            :disabled="isSaving || isDeleting"
          >
            {{ isSaving ? 'Сохраняем...' : 'Сохранить изменения' }}
          </button>
        </section>
      </form>
    </div>
  </main>
</template>

<style scoped lang="scss" src="../assets/styles/instruction-edit.scss"></style>
