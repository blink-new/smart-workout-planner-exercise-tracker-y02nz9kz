import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { Workout, WorkoutExercise, ExerciseLog, UserSettings } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { CheckCircle, Dumbbell, Target, Weight, Plus, Minus, Check } from 'lucide-react'

interface SetData {
  setNumber: number
  reps: number
  weight: number
  completed: boolean
}

export default function ActiveWorkout() {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({})
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [weightDialogOpen, setWeightDialogOpen] = useState(false)
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null)
  const [newWeight, setNewWeight] = useState<number>(0)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [workoutStartTime, setWorkoutStartTime] = useState<string | null>(null)

  const loadActiveWorkout = useCallback(async () => {
    try {
      setLoading(true)
      const userId = (await blink.auth.me()).id
      
      // Найти последнюю незавершенную тренировку
      const query = `SELECT * FROM workouts WHERE user_id = '${userId}' AND completed_at IS NULL ORDER BY created_at DESC LIMIT 1`
      const workouts = await blink.db.sql(query)

      if (workouts && workouts.length > 0) {
        const workoutData = workouts[0]
        const workout = {
          id: workoutData.id?.value || workoutData.id,
          user_id: workoutData.user_id?.value || workoutData.user_id,
          name: workoutData.name?.value || workoutData.name,
          muscle_groups: workoutData.muscle_groups?.value || workoutData.muscle_groups,
          created_at: workoutData.created_at?.value || workoutData.created_at,
          completed_at: workoutData.completed_at?.value || workoutData.completed_at,
          start_time: workoutData.start_time?.value || workoutData.start_time,
          end_time: workoutData.end_time?.value || workoutData.end_time,
          total_weight_lifted: workoutData.total_weight_lifted?.value || workoutData.total_weight_lifted,
          total_volume: workoutData.total_volume?.value || workoutData.total_volume,
          user_weight: workoutData.user_weight?.value || workoutData.user_weight
        }
        
        setActiveWorkout(workout)
        
        // Установить время начала тренировки, если еще не установлено
        if (!workout.start_time) {
          const startTime = new Date().toISOString()
          setWorkoutStartTime(startTime)
          const updateQuery = `UPDATE workouts SET start_time = '${startTime}', user_weight = ${userSettings?.body_weight || 70} WHERE id = '${workout.id}'`
          await blink.db.sql(updateQuery)
        } else {
          setWorkoutStartTime(workout.start_time)
        }

        // Загрузить упражнения тренировки
        const exercisesQuery = `SELECT * FROM workout_exercises WHERE workout_id = '${workout.id}' ORDER BY order_index ASC`
        const exercises = await blink.db.sql(exercisesQuery)

        // Загрузить данные упражнений
        const exercisesWithData = await Promise.all(
          exercises.map(async (we) => {
            try {
              const exerciseId = we.exercise_id?.value || we.exercise_id
              const exerciseQuery = `SELECT * FROM exercises WHERE id = '${exerciseId}' LIMIT 1`
              const exerciseData = await blink.db.sql(exerciseQuery)
              
              const exercise = exerciseData.length > 0 ? {
                id: exerciseData[0].id?.value || exerciseData[0].id,
                name: exerciseData[0].name?.value || exerciseData[0].name,
                muscle_group: exerciseData[0].muscle_group?.value || exerciseData[0].muscle_group,
                weight_type: exerciseData[0].weight_type?.value || exerciseData[0].weight_type,
                technique: exerciseData[0].technique?.value || exerciseData[0].technique,
                equipment_settings: exerciseData[0].equipment_settings?.value || exerciseData[0].equipment_settings,
                exercise_type: exerciseData[0].exercise_type?.value || exerciseData[0].exercise_type,
                equipment_name: exerciseData[0].equipment_name?.value || exerciseData[0].equipment_name,
                equipment_photo_url: exerciseData[0].equipment_photo_url?.value || exerciseData[0].equipment_photo_url,
                default_sets: exerciseData[0].default_sets?.value || exerciseData[0].default_sets || 3,
                default_reps: exerciseData[0].default_reps?.value || exerciseData[0].default_reps || 10
              } : null

              return {
                id: we.id?.value || we.id,
                workout_id: we.workout_id?.value || we.workout_id,
                exercise_id: exerciseId,
                order_index: we.order_index?.value || we.order_index,
                sets_planned: we.sets_planned?.value || we.sets_planned,
                weight_suggested: we.weight_suggested?.value || we.weight_suggested,
                exercise: exercise
              }
            } catch (error) {
              console.error(`Ошибка загрузки упражнения ${we.exercise_id}:`, error)
              return {
                id: we.id?.value || we.id,
                workout_id: we.workout_id?.value || we.workout_id,
                exercise_id: we.exercise_id?.value || we.exercise_id,
                order_index: we.order_index?.value || we.order_index,
                sets_planned: we.sets_planned?.value || we.sets_planned,
                weight_suggested: we.weight_suggested?.value || we.weight_suggested,
                exercise: null
              }
            }
          })
        )

        setWorkoutExercises(exercisesWithData)

        // Загрузить логи упражнений для текущей тренировки
        const logsQuery = `SELECT * FROM exercise_logs WHERE user_id = '${userId}' AND workout_date = '${new Date().toISOString().split('T')[0]}'`
        const logs = await blink.db.sql(logsQuery)

        const logsMap: Record<string, ExerciseLog> = {}
        const setsMap: Record<string, SetData[]> = {}
        
        logs.forEach(log => {
          const exerciseId = log.exercise_id?.value || log.exercise_id
          logsMap[exerciseId] = {
            id: log.id?.value || log.id,
            user_id: log.user_id?.value || log.user_id,
            exercise_id: exerciseId,
            weight_used: log.weight_used?.value || log.weight_used,
            sets_completed: log.sets_completed?.value || log.sets_completed,
            sets_planned: log.sets_planned?.value || log.sets_planned,
            reps_completed: log.reps_completed?.value || log.reps_completed,
            reps_planned: log.reps_planned?.value || log.reps_planned,
            completed: log.completed?.value || log.completed,
            weight_achieved: log.weight_achieved?.value || log.weight_achieved,
            workout_date: log.workout_date?.value || log.workout_date,
            created_at: log.created_at?.value || log.created_at
          }
        })

        // Инициализировать подходы для каждого упражнения
        exercisesWithData.forEach(we => {
          if (we.exercise) {
            const defaultSets = we.exercise.default_sets || 3
            const defaultReps = we.exercise.default_reps || 10
            const existingLog = logsMap[we.exercise_id]
            
            setsMap[we.exercise_id] = Array.from({ length: defaultSets }, (_, i) => ({
              setNumber: i + 1,
              reps: defaultReps,
              weight: existingLog?.weight_used || we.weight_suggested || 0,
              completed: false
            }))
          }
        })

        setExerciseLogs(logsMap)
        setExerciseSets(setsMap)
      }

      // Загрузить настройки пользователя
      const settingsQuery = `SELECT * FROM user_settings WHERE user_id = '${userId}' LIMIT 1`
      const settings = await blink.db.sql(settingsQuery)

      if (settings.length > 0) {
        const setting = settings[0]
        setUserSettings({
          id: setting.id?.value || setting.id,
          user_id: setting.user_id?.value || setting.user_id,
          body_weight: setting.body_weight?.value || setting.body_weight,
          created_at: setting.created_at?.value || setting.created_at,
          updated_at: setting.updated_at?.value || setting.updated_at
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки активной тренировки:', error)
    } finally {
      setLoading(false)
    }
  }, [userSettings?.body_weight])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadActiveWorkout()
      }
    })
    return unsubscribe
  }, [loadActiveWorkout])

  const openWeightDialog = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId)
    const currentWeight = exerciseSets[exerciseId]?.[0]?.weight || 0
    setNewWeight(currentWeight)
    setWeightDialogOpen(true)
  }

  const updateSetWeight = (exerciseId: string, weight: number) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId]?.map(set => ({ ...set, weight })) || []
    }))
    setWeightDialogOpen(false)
    setCurrentExerciseId(null)
  }

  const toggleSetCompleted = (exerciseId: string, setIndex: number) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId]?.map((set, i) => 
        i === setIndex ? { ...set, completed: !set.completed } : set
      ) || []
    }))
  }

  const updateSetReps = (exerciseId: string, setIndex: number, reps: number) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId]?.map((set, i) => 
        i === setIndex ? { ...set, reps } : set
      ) || []
    }))
  }

  const saveExerciseProgress = async (exerciseId: string) => {
    try {
      const userId = (await blink.auth.me()).id
      const sets = exerciseSets[exerciseId] || []
      const completedSets = sets.filter(set => set.completed)
      const totalReps = completedSets.reduce((sum, set) => sum + set.reps, 0)
      const avgWeight = sets.length > 0 ? sets[0].weight : 0
      
      const existingLog = exerciseLogs[exerciseId]
      const logData = {
        weight_used: avgWeight,
        sets_completed: completedSets.length,
        sets_planned: sets.length,
        reps_completed: totalReps,
        reps_planned: sets.reduce((sum, set) => sum + set.reps, 0),
        completed: completedSets.length === sets.length ? 1 : 0,
        weight_achieved: 0 // По умолчанию вес не взят
      }

      if (existingLog) {
        const updateQuery = `
          UPDATE exercise_logs 
          SET weight_used = ${logData.weight_used}, sets_completed = ${logData.sets_completed}, sets_planned = ${logData.sets_planned}, reps_completed = ${logData.reps_completed}, reps_planned = ${logData.reps_planned}, completed = ${logData.completed}, weight_achieved = ${logData.weight_achieved}
          WHERE id = '${existingLog.id}'
        `
        await blink.db.sql(updateQuery)
        setExerciseLogs(prev => ({
          ...prev,
          [exerciseId]: { ...existingLog, ...logData }
        }))
      } else {
        const newLogId = `log_${Date.now()}`
        const insertQuery = `
          INSERT INTO exercise_logs (id, user_id, exercise_id, weight_used, sets_completed, sets_planned, reps_completed, reps_planned, completed, weight_achieved, workout_date, created_at)
          VALUES ('${newLogId}', '${userId}', '${exerciseId}', ${logData.weight_used}, ${logData.sets_completed}, ${logData.sets_planned}, ${logData.reps_completed}, ${logData.reps_planned}, ${logData.completed}, ${logData.weight_achieved}, '${new Date().toISOString().split('T')[0]}', '${new Date().toISOString()}')
        `
        await blink.db.sql(insertQuery)
        
        const newLog: ExerciseLog = {
          id: newLogId,
          user_id: userId,
          exercise_id: exerciseId,
          ...logData,
          workout_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }

        setExerciseLogs(prev => ({
          ...prev,
          [exerciseId]: newLog
        }))
      }

      alert('Прогресс упражнения сохранен!')
    } catch (error) {
      console.error('Ошибка сохранения прогресса упражнения:', error)
    }
  }

  const markWeightAchieved = async (exerciseId: string) => {
    try {
      const userId = (await blink.auth.me()).id
      const sets = exerciseSets[exerciseId] || []
      const completedSets = sets.filter(set => set.completed)
      const totalReps = completedSets.reduce((sum, set) => sum + set.reps, 0)
      const avgWeight = sets.length > 0 ? sets[0].weight : 0
      
      // Вес взят - все подходы выполнены
      const weightAchieved = 1
      
      const existingLog = exerciseLogs[exerciseId]
      const logData = {
        weight_used: avgWeight,
        sets_completed: completedSets.length,
        sets_planned: sets.length,
        reps_completed: totalReps,
        reps_planned: sets.reduce((sum, set) => sum + set.reps, 0),
        completed: completedSets.length === sets.length ? 1 : 0,
        weight_achieved: weightAchieved
      }

      if (existingLog) {
        const updateQuery = `
          UPDATE exercise_logs 
          SET weight_used = ${logData.weight_used}, sets_completed = ${logData.sets_completed}, sets_planned = ${logData.sets_planned}, reps_completed = ${logData.reps_completed}, reps_planned = ${logData.reps_planned}, completed = ${logData.completed}, weight_achieved = ${logData.weight_achieved}
          WHERE id = '${existingLog.id}'
        `
        await blink.db.sql(updateQuery)
        setExerciseLogs(prev => ({
          ...prev,
          [exerciseId]: { ...existingLog, ...logData }
        }))
      } else {
        const newLogId = `log_${Date.now()}`
        const insertQuery = `
          INSERT INTO exercise_logs (id, user_id, exercise_id, weight_used, sets_completed, sets_planned, reps_completed, reps_planned, completed, weight_achieved, workout_date, created_at)
          VALUES ('${newLogId}', '${userId}', '${exerciseId}', ${logData.weight_used}, ${logData.sets_completed}, ${logData.sets_planned}, ${logData.reps_completed}, ${logData.reps_planned}, ${logData.completed}, ${logData.weight_achieved}, '${new Date().toISOString().split('T')[0]}', '${new Date().toISOString()}')
        `
        await blink.db.sql(insertQuery)

        const newLog: ExerciseLog = {
          id: newLogId,
          user_id: userId,
          exercise_id: exerciseId,
          ...logData,
          workout_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }

        setExerciseLogs(prev => ({
          ...prev,
          [exerciseId]: newLog
        }))
      }

      // Показать уведомление об успехе
      alert('Вес взят! В следующей тренировке вес будет увеличен на 2.5 кг.')
    } catch (error) {
      console.error('Ошибка сохранения прогресса упражнения:', error)
    }
  }

  const calculateEffectiveWeight = (exercise: any, weight: number) => {
    const userWeight = userSettings?.body_weight || 70

    switch (exercise?.weight_type) {
      case 'bodyweight':
        return userWeight
      case 'additional':
        return userWeight + weight
      case 'assisted':
        return Math.max(0, userWeight - weight)
      default:
        return weight
    }
  }

  const completeWorkout = async () => {
    if (!activeWorkout) return

    try {
      // Сохранить прогресс всех упражнений
      for (const exerciseId of Object.keys(exerciseSets)) {
        await saveExerciseProgress(exerciseId)
      }

      // Рассчитать статистику тренировки
      let totalWeightLifted = 0
      let totalVolume = 0

      workoutExercises.forEach(we => {
        const sets = exerciseSets[we.exercise_id] || []
        const completedSets = sets.filter(set => set.completed)
        
        completedSets.forEach(set => {
          const effectiveWeight = calculateEffectiveWeight(we.exercise, set.weight)
          totalWeightLifted += effectiveWeight * set.reps
          totalVolume += set.reps
        })
      })

      const endTime = new Date().toISOString()

      const updateQuery = `
        UPDATE workouts 
        SET completed_at = '${endTime}', end_time = '${endTime}', total_weight_lifted = ${totalWeightLifted}, total_volume = ${totalVolume}
        WHERE id = '${activeWorkout.id}'
      `
      await blink.db.sql(updateQuery)

      setActiveWorkout(null)
      setWorkoutExercises([])
      setExerciseLogs({})
      setExerciseSets({})
    } catch (error) {
      console.error('Ошибка завершения тренировки:', error)
    }
  }

  const getProgress = () => {
    if (workoutExercises.length === 0) return 0
    
    const completedExercises = workoutExercises.filter(we => {
      const sets = exerciseSets[we.exercise_id] || []
      const completedSets = sets.filter(set => set.completed)
      return completedSets.length === sets.length && sets.length > 0
    }).length

    return (completedExercises / workoutExercises.length) * 100
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Dumbbell className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-pulse" />
          <p className="text-slate-600">Загрузка тренировки...</p>
        </div>
      </div>
    )
  }

  if (!activeWorkout) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Нет активной тренировки</h3>
          <p className="text-slate-600 mb-4">
            Создай тренировку в генераторе, чтобы начать заниматься
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Dumbbell className="h-5 w-5 text-green-600" />
                <span>{activeWorkout.name}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {workoutExercises.length} упражнений • {JSON.parse(activeWorkout.muscle_groups || '[]').join(', ')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(getProgress())}%
              </div>
              <div className="text-sm text-slate-600">завершено</div>
            </div>
          </div>
          <Progress value={getProgress()} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Exercise List */}
      <div className="space-y-4">
        {workoutExercises.map((workoutExercise, index) => {
          const sets = exerciseSets[workoutExercise.exercise_id] || []
          const completedSets = sets.filter(set => set.completed)
          const isCompleted = completedSets.length === sets.length && sets.length > 0
          const log = exerciseLogs[workoutExercise.exercise_id]

          return (
            <Card key={workoutExercise.id} className={`transition-all ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-slate-500">
                        {index + 1}.
                      </span>
                      <div>
                        <CardTitle className="text-lg">
                          {workoutExercise.exercise?.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {workoutExercise.exercise?.muscle_group}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-3 ml-8">
                      <Badge className={getExerciseTypeColor(workoutExercise.exercise?.exercise_type || '')}>
                        {getExerciseTypeLabel(workoutExercise.exercise?.exercise_type || '')}
                      </Badge>
                      <Badge variant="outline">
                        {getWeightTypeLabel(workoutExercise.exercise?.weight_type || '')}
                      </Badge>
                      {workoutExercise.weight_suggested && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Предыдущий: {workoutExercise.weight_suggested} кг
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {completedSets.length}/{sets.length} подходов
                      </Badge>
                      {log?.weight_achieved === 1 && (
                        <Badge className="bg-green-600 text-white">
                          Вес взят!
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isCompleted && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Technique */}
                {workoutExercise.exercise?.technique && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-sm text-slate-700 mb-1">Техника:</h4>
                    <p className="text-sm text-slate-600">{workoutExercise.exercise.technique}</p>
                  </div>
                )}

                {/* Equipment Settings */}
                {workoutExercise.exercise?.equipment_settings && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-sm text-slate-700 mb-1">Настройки тренажера:</h4>
                    <p className="text-sm text-slate-600">{workoutExercise.exercise.equipment_settings}</p>
                  </div>
                )}

                {/* Weight Setting */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center space-x-2">
                    <Weight className="h-5 w-5 text-slate-600" />
                    <span className="font-medium">Вес: {sets[0]?.weight || 0} кг</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openWeightDialog(workoutExercise.exercise_id)}
                  >
                    Изменить вес
                  </Button>
                </div>

                {/* Sets Grid */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Подходы</span>
                  </h4>
                  
                  <div className="grid gap-3">
                    {sets.map((set, setIndex) => (
                      <div 
                        key={setIndex} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                          set.completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="font-medium text-slate-600 w-8">
                            {set.setNumber}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateSetReps(workoutExercise.exercise_id, setIndex, Math.max(1, set.reps - 1))}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            
                            <Input
                              type="number"
                              value={set.reps}
                              onChange={(e) => updateSetReps(workoutExercise.exercise_id, setIndex, parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                              min="0"
                            />
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateSetReps(workoutExercise.exercise_id, setIndex, set.reps + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <span className="text-sm text-slate-600">повторений</span>
                        </div>
                        
                        <Button
                          variant={set.completed ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleSetCompleted(workoutExercise.exercise_id, setIndex)}
                          className={set.completed ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {set.completed ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Выполнено
                            </>
                          ) : (
                            'Выполнить'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveExerciseProgress(workoutExercise.exercise_id)}
                    variant="outline"
                    className="flex-1"
                  >
                    Сохранить прогресс
                  </Button>
                  
                  {completedSets.length > 0 && log?.weight_achieved !== 1 && (
                    <Button 
                      onClick={() => markWeightAchieved(workoutExercise.exercise_id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Вес взят! (+2.5 кг)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Complete Workout Button */}
      {getProgress() === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">
              Тренировка завершена!
            </h3>
            <p className="text-green-700 mb-4">
              Отличная работа! Все упражнения выполнены.
            </p>
            <Button 
              onClick={completeWorkout}
              className="bg-green-600 hover:bg-green-700"
            >
              Завершить тренировку
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weight Dialog */}
      <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Установить вес</DialogTitle>
            <DialogDescription>
              Введите вес для всех подходов этого упражнения
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight-input">Вес (кг)</Label>
              <Input
                id="weight-input"
                type="number"
                placeholder="0"
                value={newWeight}
                onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (currentExerciseId) {
                      updateSetWeight(currentExerciseId, newWeight)
                    }
                  }
                }}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setWeightDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={() => {
                if (currentExerciseId) {
                  updateSetWeight(currentExerciseId, newWeight)
                }
              }}>
                Установить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}