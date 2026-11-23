// роли пользователя
export type UserRole = 'student' | 'expert'

// данные для регистрации
export interface RegisterData {
  username: string
  email: string
  password: string
}

// данные для входа
export interface LoginData {
  email: string
  password: string
}

// данные для обновления профиля
export interface UpdateProfileData {
  username: string
  email: string
  role: UserRole
}

// информация о пользователе
export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}
