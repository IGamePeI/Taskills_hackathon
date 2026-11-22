import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { progressApi } from '../api/progress.api'
import { useAuthStore } from './auth'

import type { StoredProgress } from '../types/progress'

// состояние прохождения инструкции
export const useProgressStore = defineStore('progress', () => {
  const auth = useAuthStore()

  const lastCompletedStep = ref(0)
  const activeStepNumber = ref(1)
  const isCompleted = ref(false)

  const isSaving = ref(false)

  // Проверяем авторизацию перед работой с прогрессом
  async function ensureAuthInitialized() {
    if (!auth.isInitialized) {
      await auth.fetchCurrentUser()
    }
  }

  // Ключ локального сохранения инструкции
  function getStorageKey(instructionId: number): string {
    return `guide-list-progress-${instructionId}`
  }

  // Сохраняем состояние в браузере
  function saveLocalProgress(instructionId: number) {
    const data: StoredProgress = {
      lastCompletedStep: lastCompletedStep.value,
      activeStepNumber: activeStepNumber.value,
      isCompleted: isCompleted.value,
    }

    localStorage.setItem(getStorageKey(instructionId), JSON.stringify(data))
  }

  // Загружаем прогресс гостя из localStorage
  function loadLocalProgress(instructionId: number, totalSteps: number) {
    const key = getStorageKey(instructionId)
    const saved = localStorage.getItem(key)

    if (!saved) return

    try {
      const data: Partial<StoredProgress> = JSON.parse(saved)

      const savedLastStep = Number(data.lastCompletedStep)
      const safeLastStep = Number.isFinite(savedLastStep)
        ? Math.trunc(savedLastStep)
        : 0

      lastCompletedStep.value = Math.min(
        Math.max(safeLastStep, 0),
        totalSteps,
      )

      isCompleted.value =
        data.isCompleted === true &&
        lastCompletedStep.value === totalSteps

      const savedActiveStep = Number(data.activeStepNumber)
      const safeActiveStep = Number.isFinite(savedActiveStep)
        ? Math.trunc(savedActiveStep)
        : lastCompletedStep.value + 1

      const maxActiveStep = Math.min(
        lastCompletedStep.value + 1,
        totalSteps,
      )

      activeStepNumber.value = isCompleted.value
        ? totalSteps
        : Math.min(Math.max(safeActiveStep, 1), maxActiveStep)

      // Сохраняем уже проверенные данные
      saveLocalProgress(instructionId)
    } catch (error) {
      console.warn('Не удалось прочитать сохранённый прогресс:', error)
      localStorage.removeItem(key)
    }
  }

  // Загружаем сохранённый прогресс
  async function loadProgress(instructionId: number, totalSteps: number) {
    lastCompletedStep.value = 0
    activeStepNumber.value = 1
    isCompleted.value = false

    if (totalSteps <= 0) return

    await ensureAuthInitialized()

    // Авторизованный пользователь получает прогресс с backend
    if (auth.isAuthenticated) {
      try {
        const records = await progressApi.getMyProgress()

        const saved = records.find(
          (record) => record.instruction_id === instructionId,
        )

        if (!saved) return

        lastCompletedStep.value = Math.min(
          Math.max(saved.last_completed_step, 0),
          totalSteps,
        )

        isCompleted.value =
          saved.is_completed &&
          lastCompletedStep.value === totalSteps

        activeStepNumber.value = isCompleted.value
          ? totalSteps
          : Math.min(lastCompletedStep.value + 1, totalSteps)
      } catch (error) {
        console.error('Не удалось загрузить прогресс с backend:', error)
      }

      return
    }

    // Гость получает прогресс из localStorage
    loadLocalProgress(instructionId, totalSteps)
  }

  // Проверяем, разрешено ли открыть шаг
  function canOpenStep(stepNumber: number): boolean {
    return stepNumber <= lastCompletedStep.value + 1
  }

  // Переходим к выбранному шагу
  function selectStep(stepNumber: number, instructionId: number) {
    if (!canOpenStep(stepNumber)) return

    activeStepNumber.value = stepNumber

    // Активный шаг сохраняем локально только для гостя
    if (!auth.isAuthenticated) {
      saveLocalProgress(instructionId)
    }
  }

  // Отправляем прогресс на backend или сохраняем локально
  async function syncProgress(instructionId: number) {
    isSaving.value = true

    try {
      await ensureAuthInitialized()

      if (auth.isAuthenticated) {
        await progressApi.update({
          instruction_id: instructionId,
          last_completed_step: lastCompletedStep.value,
          is_completed: isCompleted.value,
        })
      } else {
        saveLocalProgress(instructionId)
      }
    } catch (error) {
      console.error('Не удалось сохранить прогресс:', error)
    } finally {
      isSaving.value = false
    }
  }

  // Сбрасываем прогресс инструкции
  async function resetProgress(instructionId: number) {
    await ensureAuthInitialized()

    if (auth.isAuthenticated) {
      isSaving.value = true

      try {
        // Используем существующий endpoint обновления прогресса
        await progressApi.update({
          instruction_id: instructionId,
          last_completed_step: 0,
          is_completed: false,
        })
      } finally {
        isSaving.value = false
      }
    }

    // Меняем состояние только после успешного ответа backend
    lastCompletedStep.value = 0
    activeStepNumber.value = 1
    isCompleted.value = false

    // Гостевой прогресс сбрасываем только в браузере
    if (!auth.isAuthenticated) {
      saveLocalProgress(instructionId)
    }
  }

  // Подтверждаем текущий шаг
  async function completeCurrentStep(
    instructionId: number,
    totalSteps: number,
  ) {
    const current = activeStepNumber.value

    if (!canOpenStep(current)) return

    // Если шаг уже выполнен, просто переходим дальше
    if (current <= lastCompletedStep.value) {
      if (current < totalSteps) {
        activeStepNumber.value = current + 1
      }

      if (!auth.isAuthenticated) {
        saveLocalProgress(instructionId)
      }

      return
    }

    // Нельзя пропустить шаг
    if (current !== lastCompletedStep.value + 1) return

    lastCompletedStep.value = current

    if (lastCompletedStep.value === totalSteps) {
      isCompleted.value = true
    } else {
      activeStepNumber.value = current + 1
    }

    await syncProgress(instructionId)
  }

  // Процент выполнения
  const percentage = computed(() => lastCompletedStep.value)

  return {
    lastCompletedStep,
    activeStepNumber,
    isCompleted,
    isSaving,
    percentage,
    loadProgress,
    resetProgress,
    canOpenStep,
    selectStep,
    completeCurrentStep,
  }
})