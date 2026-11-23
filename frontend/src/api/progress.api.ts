import http from './http'
import type {
  ProgressRecord,
  ProgressUpdate,
  InstructionAnalytics,
} from '../types/progress'

export const progressApi = {
  // получаем прогресс авторизованного пользователя
  async getMyProgress(): Promise<ProgressRecord[]> {
    const response = await http.get('/v1/progress/my')

    return response.data
  },

  // отправляем обновлённый прогресс на backend
  async update(data: ProgressUpdate) {
    const response = await http.post('/v1/progress/', data)

    return response.data
  },

  // получаем аналитику инструкции
  async getAnalytics(instructionId: number): Promise<InstructionAnalytics> {
    const response = await http.get<InstructionAnalytics>(
      `/v1/progress/analytics/${instructionId}`,
    )

    return response.data
  },
}
