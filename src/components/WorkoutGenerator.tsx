import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { Exercise, Workout, WorkoutExercise, MUSCLE_GROUPS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Zap, Dumbbell, Play, Shuffle, Target, RefreshCw } from 'lucide-react'

interface MuscleGroupConfig {
  muscleGroup: string
  primaryCount: number
  auxiliaryCount: number
  isolationCount: number
}

export default function WorkoutGenerator() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([])
  const [muscleGroupConfigs, setMuscleGroupConfigs] = useState<Record<string, MuscleGroupConfig>>({})
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const loadExercises = useCallback(async () => {
    try {
      console.log('Начинаем загрузку упражнений...')
      const user = await blink.auth.me()
      console.log('Пользователь:', user.id)
      
      // Используем прямой SQL запрос для надежности
      console.log('Загружаем упражнения через SQL...')
      const result = await blink.db.sql`
        SELECT * FROM exercises 
        WHERE user_id = ${user.id} 
        ORDER BY created_at DESC
      `
      
      console.log('SQL результат:', result)
      console.log('Загружено упражнений через SQL:', result.length)
      
      if (result && result.length > 0) {
        // Преобразуем результат в правильный формат
        const exercises = result.map(row => ({
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          muscle_group: row.muscle_group,
          weight_type: row.weight_type,
          technique: row.technique,
          equipment_settings: row.equipment_settings,
          exercise_type: row.exercise_type,
          equipment_name: row.equipment_name,
          equipment_photo_url: row.equipment_photo_url,
          default_sets: row.default_sets,
          default_reps: row.default_reps,
          rest_time_seconds: row.rest_time_seconds,
          created_at: row.created_at,
          updated_at: row.updated_at
        }))
        
        console.log('Преобразованные упражнения:', exercises)
        setExercises(exercises)
      } else {
        console.log('SQL вернул пустой результат')
        setExercises([])
      }
    } catch (error) {
      console.error('Ошибка загрузки упражнений:', error)
      console.error('Детали ошибки:', error.message)
      console.error('Stack trace:', error.stack)
      setExercises([])
    }
  }, [])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      console.log('Auth state changed:', state)
      setUser(state.user)
      if (state.user && !state.isLoading) {
        console.log('Пользователь авторизован, загружаем упражнения...')
        loadExercises()
      }
    })
    return unsubscribe
  }, [loadExercises])

  const getLastWeight = useCallback(async (exerciseId: string) => {
    try {
      const user = await blink.auth.me()
      const result = await blink.db.sql`
        SELECT * FROM exercise_logs 
        WHERE user_id = ${user.id} AND exercise_id = ${exerciseId}
        ORDER BY created_at DESC 
        LIMIT 1
      `
      
      if (result.length === 0) return undefined
      
      const lastLog = result[0]
      const baseWeight = lastLog.weight_used || 0
      
      // Если вес был взят (все подходы выполнены), увеличиваем на 2.5 кг
      // Если вес не был взят, оставляем тот же вес
      const weightAchieved = Number(lastLog.weight_achieved) > 0
      const suggestedWeight = weightAchieved ? baseWeight + 2.5 : baseWeight
      
      return suggestedWeight
    } catch (error) {
      console.error('Ошибка получения последнего веса:', error)
      return undefined
    }
  }, [])

  const generateWorkout = async () => {
    if (selectedMuscleGroups.length === 0) {
      return
    }

    setLoading(true)
    try {
      const workoutExercises: WorkoutExercise[] = []
      let orderIndex = 0

      for (const muscleGroup of selectedMuscleGroups) {
        const config = muscleGroupConfigs[muscleGroup]
        if (!config) continue

        // Найти упражнения по типам для группы мышц
        console.log(`Ищем упражнения для группы мышц: ${muscleGroup}`)
        console.log('Все упражнения:', exercises.map(ex => ({ name: ex.name, muscle_group: ex.muscle_group, exercise_type: ex.exercise_type })))
        
        const primaryExercises = exercises.filter(
          ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'primary'
        )
        const auxiliaryExercises = exercises.filter(
          ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'auxiliary'
        )
        const isolationExercises = exercises.filter(
          ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'isolation'
        )
        
        console.log(`Найдено для ${muscleGroup}:`, {
          primary: primaryExercises.length,
          auxiliary: auxiliaryExercises.length,
          isolation: isolationExercises.length
        })

        // Добавить основные упражнения
        const selectedPrimary = [...primaryExercises]
          .sort(() => Math.random() - 0.5)
          .slice(0, config.primaryCount)

        for (const exercise of selectedPrimary) {
          const lastWeight = await getLastWeight(exercise.id)
          workoutExercises.push({
            id: `workout_ex_${Date.now()}_${orderIndex}`,
            workout_id: '',
            exercise_id: exercise.id,
            order_index: orderIndex++,
            sets_planned: exercise.default_sets || 3,
            weight_suggested: lastWeight,
            exercise: exercise
          })
        }

        // Добавить вспомогательные упражнения
        const selectedAuxiliary = [...auxiliaryExercises]
          .sort(() => Math.random() - 0.5)
          .slice(0, config.auxiliaryCount)

        for (const exercise of selectedAuxiliary) {
          const lastWeight = await getLastWeight(exercise.id)
          workoutExercises.push({
            id: `workout_ex_${Date.now()}_${orderIndex}`,
            workout_id: '',
            exercise_id: exercise.id,
            order_index: orderIndex++,
            sets_planned: exercise.default_sets || 3,
            weight_suggested: lastWeight,
            exercise: exercise
          })
        }

        // Добавить изолированные упражнения
        const selectedIsolation = [...isolationExercises]
          .sort(() => Math.random() - 0.5)
          .slice(0, config.isolationCount)

        for (const exercise of selectedIsolation) {
          const lastWeight = await getLastWeight(exercise.id)
          workoutExercises.push({
            id: `workout_ex_${Date.now()}_${orderIndex}`,
            workout_id: '',
            exercise_id: exercise.id,
            order_index: orderIndex++,
            sets_planned: exercise.default_sets || 3,
            weight_suggested: lastWeight,
            exercise: exercise
          })
        }
      }

      setGeneratedWorkout(workoutExercises)
    } catch (error) {
      console.error('Ошибка генерации тренировки:', error)
    } finally {
      setLoading(false)
    }
  }

  const replaceExercise = async (workoutExerciseId: string, currentExerciseId: string) => {
    const workoutExercise = generatedWorkout.find(we => we.id === workoutExerciseId)
    if (!workoutExercise || !workoutExercise.exercise) return

    const muscleGroup = workoutExercise.exercise.muscle_group
    const exerciseType = workoutExercise.exercise.exercise_type

    // Найти альтернативные упражнения того же типа и группы мышц
    const alternatives = exercises.filter(ex => 
      ex.muscle_group === muscleGroup && 
      ex.exercise_type === exerciseType &&
      ex.id !== currentExerciseId &&
      !generatedWorkout.some(we => we.exercise_id === ex.id) // Исключить уже используемые
    )

    if (alternatives.length === 0) {
      alert('Нет альтернативных упражнений для замены')
      return
    }

    // Выбрать случайное альтернативное упражнение
    const newExercise = alternatives[Math.floor(Math.random() * alternatives.length)]
    const lastWeight = await getLastWeight(newExercise.id)

    // Обновить тренировку
    setGeneratedWorkout(prev => prev.map(we => 
      we.id === workoutExerciseId 
        ? { ...we, exercise_id: newExercise.id, weight_suggested: lastWeight, exercise: newExercise }
        : we
    ))
  }

  const startWorkout = async () => {
    if (generatedWorkout.length === 0) return

    try {
      const user = await blink.auth.me()
      const workoutId = `workout_${Date.now()}`
      
      console.log('Создаем тренировку:', workoutId)
      
      // Создать тренировку через SQL
      await blink.db.sql`
        INSERT INTO workouts (id, user_id, name, muscle_groups, created_at)
        VALUES (${workoutId}, ${user.id}, ${'Тренировка ' + new Date().toLocaleDateString()}, ${JSON.stringify(selectedMuscleGroups)}, ${new Date().toISOString()})
      `
      
      console.log('Тренировка создана, создаем упражнения...')
      
      // Создать упражнения тренировки через SQL
      for (const workoutExercise of generatedWorkout) {
        console.log('Создаю упражнение тренировки:', {
          workout_id: workoutId,
          exercise_id: workoutExercise.exercise_id,
          order_index: workoutExercise.order_index,
          sets_planned: workoutExercise.sets_planned,
          weight_suggested: workoutExercise.weight_suggested || null
        })
        
        await blink.db.sql`
          INSERT INTO workout_exercises (workout_id, exercise_id, order_index, sets_planned, weight_suggested)
          VALUES (${workoutId}, ${workoutExercise.exercise_id}, ${workoutExercise.order_index}, ${workoutExercise.sets_planned}, ${workoutExercise.weight_suggested || null})
        `
      }

      console.log('Тренировка создана успешно:', workoutId)
      alert('Тренировка создана! Переходи на вкладку "Тренировка" для выполнения.')
      
    } catch (error) {
      console.error('Ошибка создания тренировки:', error)
      alert('Ошибка создания тренировки: ' + error.message)
    }
  }

  const toggleMuscleGroup = (muscleGroup: string) => {
    setSelectedMuscleGroups(prev => {
      const newSelected = prev.includes(muscleGroup)
        ? prev.filter(mg => mg !== muscleGroup)
        : [...prev, muscleGroup]
      
      // Инициализировать конфигурацию для новой группы мышц
      if (!prev.includes(muscleGroup)) {
        setMuscleGroupConfigs(prevConfigs => ({
          ...prevConfigs,
          [muscleGroup]: {
            muscleGroup,
            primaryCount: 1,
            auxiliaryCount: 1,
            isolationCount: 1
          }
        }))
      }
      
      return newSelected
    })
  }

  const updateMuscleGroupConfig = (muscleGroup: string, field: keyof Omit<MuscleGroupConfig, 'muscleGroup'>, value: number) => {
    setMuscleGroupConfigs(prev => ({
      ...prev,
      [muscleGroup]: {
        ...prev[muscleGroup],
        [field]: Math.max(0, value)
      }
    }))
  }

  const getExerciseTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800'
      case 'auxiliary': return 'bg-amber-100 text-amber-800'
      case 'isolation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getExerciseTypeLabel = (type: string) => {
    switch (type) {
      case 'primary': return 'Основное'
      case 'auxiliary': return 'Вспомогательное'
      case 'isolation': return 'Изолированное'
      default: return type
    }
  }

  const getWeightTypeLabel = (type: string) => {
    switch (type) {
      case 'bodyweight': return 'Свой вес'
      case 'additional': return 'Доп. вес'
      case 'assisted': return 'Антивес'
      default: return type
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Dumbbell className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-pulse" />
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Генератор тренировок</h2>
        <p className="text-slate-600">Создай разнообразную тренировку из своих упражнений</p>
      </div>

      {/* Muscle Group Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Выбери группы мышц и количество упражнений</span>
          </CardTitle>
          <CardDescription>
            Настрой количество упражнений каждого типа для каждой группы мышц
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MUSCLE_GROUPS.map(muscleGroup => {
              const primaryCount = exercises.filter(ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'primary').length
              const auxiliaryCount = exercises.filter(ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'auxiliary').length
              const isolationCount = exercises.filter(ex => ex.muscle_group === muscleGroup && ex.exercise_type === 'isolation').length
              const hasExercises = primaryCount > 0 || auxiliaryCount > 0 || isolationCount > 0
              const isSelected = selectedMuscleGroups.includes(muscleGroup)
              const config = muscleGroupConfigs[muscleGroup]
              
              console.log(`Группа мышц ${muscleGroup}:`, { primaryCount, auxiliaryCount, isolationCount, hasExercises })

              return (
                <div key={muscleGroup} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Checkbox
                      id={muscleGroup}
                      checked={isSelected}
                      onCheckedChange={() => toggleMuscleGroup(muscleGroup)}
                      disabled={!hasExercises}
                    />
                    <label 
                      htmlFor={muscleGroup} 
                      className={`text-lg font-medium cursor-pointer ${
                        !hasExercises ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {muscleGroup}
                    </label>
                    <div className="text-sm text-slate-500">
                      ({primaryCount} осн. / {auxiliaryCount} всп. / {isolationCount} изол.)
                    </div>
                  </div>

                  {isSelected && config && (
                    <div className="grid grid-cols-3 gap-4 mt-3 pl-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-blue-700">Основные</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={primaryCount}
                            value={config.primaryCount}
                            onChange={(e) => updateMuscleGroupConfig(muscleGroup, 'primaryCount', parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm text-slate-500">из {primaryCount}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-700">Вспомогательные</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={auxiliaryCount}
                            value={config.auxiliaryCount}
                            onChange={(e) => updateMuscleGroupConfig(muscleGroup, 'auxiliaryCount', parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm text-slate-500">из {auxiliaryCount}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-purple-700">Изолированные</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={isolationCount}
                            value={config.isolationCount}
                            onChange={(e) => updateMuscleGroupConfig(muscleGroup, 'isolationCount', parseInt(e.target.value) || 0)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm text-slate-500">из {isolationCount}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasExercises && (
                    <p className="text-sm text-red-500 mt-2">Нет упражнений для этой группы мышц</p>
                  )}
                </div>
              )
            })}
          </div>
          
          {selectedMuscleGroups.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {selectedMuscleGroups.map(mg => (
                    <Badge key={mg} variant="secondary">{mg}</Badge>
                  ))}
                </div>
                <Button 
                  onClick={generateWorkout} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Shuffle className="h-4 w-4 mr-2 animate-spin" />
                      Генерирую...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Сгенерировать тренировку
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Workout */}
      {generatedWorkout.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Dumbbell className="h-5 w-5 text-green-600" />
                  <span>Сгенерированная тренировка</span>
                </CardTitle>
                <CardDescription>
                  {generatedWorkout.length} упражнений для {selectedMuscleGroups.length} групп мышц
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={generateWorkout}
                  disabled={loading}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Перегенерировать
                </Button>
                <Button 
                  onClick={startWorkout}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Начать тренировку
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedMuscleGroups.map(muscleGroup => {
                const groupExercises = generatedWorkout.filter(we => we.exercise?.muscle_group === muscleGroup)
                
                if (groupExercises.length === 0) return null

                return (
                  <div key={muscleGroup} className="border border-slate-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">{muscleGroup}</h3>
                    <div className="space-y-3">
                      {groupExercises.map((workoutExercise, index) => (
                        <div key={workoutExercise.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-slate-500">
                                {index + 1}.
                              </span>
                              <div>
                                <h4 className="font-medium text-slate-900">
                                  {workoutExercise.exercise?.name}
                                </h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className={getExerciseTypeColor(workoutExercise.exercise?.exercise_type || '')}>
                                    {getExerciseTypeLabel(workoutExercise.exercise?.exercise_type || '')}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getWeightTypeLabel(workoutExercise.exercise?.weight_type || '')}
                                  </Badge>
                                  {workoutExercise.weight_suggested && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      Предыдущий вес: {workoutExercise.weight_suggested} кг
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-600">
                              {workoutExercise.sets_planned} подхода
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => replaceExercise(workoutExercise.id, workoutExercise.exercise_id)}
                              className="h-8 w-8 p-0"
                              title="Заменить упражнение"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {exercises.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Нет упражнений</h3>
            <p className="text-slate-600 mb-4">
              Добавь упражнения в базу данных, чтобы генерировать тренировки
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}