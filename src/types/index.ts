export interface Exercise {
  id: string
  user_id: string
  name: string
  muscle_group: string
  weight_type: string
  technique: string
  equipment_settings?: string
  exercise_type: string
  equipment_name?: string
  equipment_photo_url?: string
  default_sets: number
  default_reps: number
  created_at: string
  updated_at: string
}

export interface ExerciseLog {
  id: string
  user_id: string
  exercise_id: string
  weight_used?: number
  sets_completed: number
  sets_planned: number
  reps_completed: number
  reps_planned: number
  completed: number
  weight_achieved: number // 0 = не взят, 1 = взят
  workout_date: string
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  name: string
  muscle_groups: string // Stored as JSON string in database
  created_at: string
  completed_at?: string
  start_time?: string
  end_time?: string
  total_weight_lifted?: number
  total_volume?: number
  user_weight?: number
}

export interface UserSettings {
  id: string
  user_id: string
  body_weight: number
  created_at: string
  updated_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  order_index: number
  sets_planned: number
  weight_suggested?: number
  exercise?: Exercise
}

export const MUSCLE_GROUPS = [
  'Грудь',
  'Спина',
  'Плечи',
  'Бицепс',
  'Трицепс',
  'Ноги',
  'Пресс',
  'Предплечья'
] as const

export const WEIGHT_TYPES = [
  'Свой вес',
  'Дополнительный вес',
  'Антивес'
] as const

export const EXERCISE_TYPES = [
  'Основное',
  'Вспомогательное',
  'Изолированное'
] as const

export type MuscleGroup = typeof MUSCLE_GROUPS[number]
export type WeightType = typeof WEIGHT_TYPES[number]
export type ExerciseType = typeof EXERCISE_TYPES[number]