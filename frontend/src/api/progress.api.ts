import http from './http'
import type {
  ProgressUpdate,
  InstructionAnalytics,
} from '../types/progress'

export const progressApi = {
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