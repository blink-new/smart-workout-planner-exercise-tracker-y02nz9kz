import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { Workout, UserSettings } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Calendar, Clock, Weight, TrendingUp, Settings, History, Dumbbell } from 'lucide-react'

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [bodyWeight, setBodyWeight] = useState(70)

  const loadWorkoutHistory = useCallback(async () => {
    try {
      setLoading(true)
      const userId = (await blink.auth.me()).id
      
      // Загрузить завершенные тренировки
      const completedWorkouts = await blink.db.workouts.list({
        where: { 
          userId: userId,
          completedAt: { '!=': null }
        },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })

      setWorkouts(completedWorkouts)

      // Загрузить настройки пользователя
      const settings = await blink.db.userSettings.list({
        where: { userId: userId },
        limit: 1
      })

      if (settings.length > 0) {
        setUserSettings(settings[0])
        setBodyWeight(settings[0].bodyWeight || 70)
      }
    } catch (error) {
      console.error('Ошибка загрузки истории тренировок:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadWorkoutHistory()
      }
    })
    return unsubscribe
  }, [loadWorkoutHistory])

  const saveUserSettings = async () => {
    try {
      const userId = (await blink.auth.me()).id
      const settingsData = {
        bodyWeight: bodyWeight,
        updatedAt: new Date().toISOString()
      }

      if (userSettings) {
        await blink.db.userSettings.update(userSettings.id, settingsData)
        setUserSettings({ ...userSettings, ...settingsData })
      } else {
        const newSettings = {
          id: `settings_${Date.now()}`,
          userId: userId,
          bodyWeight: bodyWeight,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await blink.db.userSettings.create(newSettings)
        setUserSettings(newSettings)
      }

      setSettingsDialogOpen(false)
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
    }
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'Не указано'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}ч ${remainingMinutes}м`
    }
    return `${minutes}м`
  }

  const calculateEffectiveWeight = (workout: Workout, weightType: string, exerciseWeight: number) => {
    const userWeight = workout.userWeight || userSettings?.bodyWeight || 70

    switch (weightType) {
      case 'bodyweight':
        return userWeight
      case 'additional':
        return userWeight + exerciseWeight
      case 'assisted':
        return Math.max(0, userWeight - exerciseWeight)
      default:
        return exerciseWeight
    }
  }

  const getWorkoutStats = (workout: Workout) => {
    return {
      duration: formatDuration(workout.startTime, workout.endTime),
      totalWeight: workout.totalWeightLifted || 0,
      totalVolume: workout.totalVolume || 0,
      muscleGroups: JSON.parse(workout.muscleGroups || '[]')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <History className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-pulse" />
          <p className="text-slate-600">Загрузка истории...</p>
        </div>
      </div>
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">История тренировок</h2>
          <p className="text-slate-600">Просматривай свой прогресс и статистику</p>
        </div>
        
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Настройки пользователя</DialogTitle>
              <DialogDescription>
                Укажи свой вес для правильного расчета статистики
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="body-weight">Вес тела (кг)</Label>
                <Input
                  id="body-weight"
                  type="number"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 70)}
                  placeholder="70"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={saveUserSettings}>
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Overview */}
      {workouts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Всего тренировок</p>
                  <p className="text-2xl font-bold text-slate-900">{workouts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-slate-600">Общее время</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(workouts.reduce((total, w) => {
                      if (w.startTime && w.endTime) {
                        const duration = new Date(w.endTime).getTime() - new Date(w.startTime).getTime()
                        return total + duration / (1000 * 60)
                      }
                      return total
                    }, 0))}м
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Weight className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-slate-600">Общий вес</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(workouts.reduce((total, w) => total + (w.totalWeightLifted || 0), 0))}кг
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-slate-600">Объем</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(workouts.reduce((total, w) => total + (w.totalVolume || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workout History List */}
      <div className="space-y-4">
        {workouts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Нет завершенных тренировок</h3>
              <p className="text-slate-600">
                Завершите свою первую тренировку, чтобы увидеть статистику здесь
              </p>
            </CardContent>
          </Card>
        ) : (
          workouts.map((workout) => {
            const stats = getWorkoutStats(workout)
            
            return (
              <Card key={workout.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Dumbbell className="h-5 w-5 text-blue-600" />
                        <span>{workout.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(workout.createdAt).toLocaleDateString('ru-RU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardDescription>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-slate-600">
                        {workout.completedAt && new Date(workout.completedAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Muscle Groups */}
                    <div className="flex flex-wrap gap-2">
                      {stats.muscleGroups.map((group: string) => (
                        <Badge key={group} variant="secondary">{group}</Badge>
                      ))}
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="text-center">
                        <Clock className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                        <p className="text-sm text-slate-600">Время</p>
                        <p className="font-semibold">{stats.duration}</p>
                      </div>
                      
                      <div className="text-center">
                        <Weight className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                        <p className="text-sm text-slate-600">Общий вес</p>
                        <p className="font-semibold">{Math.round(stats.totalWeight)}кг</p>
                      </div>
                      
                      <div className="text-center">
                        <TrendingUp className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                        <p className="text-sm text-slate-600">Объем</p>
                        <p className="font-semibold">{Math.round(stats.totalVolume)}</p>
                      </div>
                      
                      <div className="text-center">
                        <Dumbbell className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                        <p className="text-sm text-slate-600">Вес тела</p>
                        <p className="font-semibold">{workout.userWeight || userSettings?.bodyWeight || 70}кг</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}