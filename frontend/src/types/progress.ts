export interface ProgressUpdate {
  instruction_id: number
  last_completed_step: number
  is_completed: boolean
}

export interface ProgressRecord {
  id: number
  user_id: number | null
  session_id: string | null
  instruction_id: number
  last_completed_step: number
  is_completed: boolean
  started_at: string
  updated_at: string
}

export interface StoredProgress {
  lastCompletedStep: number
  activeStepNumber: number
  isCompleted: boolean
}

// статистика отдельного шага
export interface StepBottleneckStat {
  step_number: number
  step_title: string
  users_reached: number
  users_dropped_here: number
  dislikes_count: number
}

// общая аналитика инструкции
export interface InstructionAnalytics {
  instruction_id: number
  total_started: number
  total_completed: number
  completion_rate: number
  steps_stats: StepBottleneckStat[]
}
