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
