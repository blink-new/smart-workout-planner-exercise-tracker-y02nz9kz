import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Progress } from './ui/progress'
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react'

export default function ExerciseTimer() {
  const [timeLeft, setTimeLeft] = useState(90) // 90 секунд по умолчанию
  const [initialTime, setInitialTime] = useState(90)
  const [isRunning, setIsRunning] = useState(false)
  const [customTime, setCustomTime] = useState('90')
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Создать аудио элемент для уведомлений
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {
                // Игнорировать ошибки воспроизведения
              })
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, soundEnabled])

  const startTimer = () => {
    if (timeLeft > 0) {
      setIsRunning(true)
    }
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(initialTime)
  }

  const setCustomTimer = () => {
    const time = parseInt(customTime)
    if (time > 0 && time <= 3600) { // Максимум 1 час
      setInitialTime(time)
      setTimeLeft(time)
      setIsRunning(false)
    }
  }

  const setPresetTime = (seconds: number) => {
    setInitialTime(seconds)
    setTimeLeft(seconds)
    setIsRunning(false)
    setCustomTime(seconds.toString())
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    if (initialTime === 0) return 0
    return ((initialTime - timeLeft) / initialTime) * 100
  }

  const getTimerColor = () => {
    if (timeLeft === 0) return 'text-red-600'
    if (timeLeft <= 10) return 'text-orange-600'
    return 'text-slate-900'
  }

  const getProgressColor = () => {
    if (timeLeft === 0) return 'bg-red-600'
    if (timeLeft <= 10) return 'bg-orange-600'
    return 'bg-blue-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Таймер упражнений</h2>
        <p className="text-slate-600">Отслеживай время отдыха между подходами</p>
      </div>

      {/* Main Timer */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Timer className="h-6 w-6 text-blue-600" />
            <span>Таймер отдыха</span>
          </CardTitle>
          <CardDescription>
            {timeLeft === 0 ? 'Время вышло!' : 'Время до следующего подхода'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getTimerColor()} transition-colors`}>
              {formatTime(timeLeft)}
            </div>
            <Progress 
              value={getProgress()} 
              className="mt-4"
              style={{
                '--progress-background': getProgressColor()
              } as React.CSSProperties}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            {!isRunning ? (
              <Button 
                onClick={startTimer} 
                disabled={timeLeft === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Старт
              </Button>
            ) : (
              <Button 
                onClick={pauseTimer}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Пауза
              </Button>
            )}
            
            <Button 
              onClick={resetTimer}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Сброс
            </Button>
            
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="icon"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timer Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые настройки</CardTitle>
          <CardDescription>
            Выбери готовое время или установи свое
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[30, 60, 90, 120, 180, 300].map(seconds => (
              <Button
                key={seconds}
                variant={initialTime === seconds ? "default" : "outline"}
                onClick={() => setPresetTime(seconds)}
                className="h-12"
              >
                {seconds < 60 ? `${seconds}с` : `${Math.floor(seconds / 60)}м`}
                {seconds >= 60 && seconds % 60 > 0 && ` ${seconds % 60}с`}
              </Button>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="custom-time">Свое время (секунды)</Label>
              <Input
                id="custom-time"
                type="number"
                min="1"
                max="3600"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="90"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={setCustomTimer} variant="outline">
                Установить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Советы по отдыху</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>30-60 сек</strong> - для легких упражнений и изоляции</li>
            <li>• <strong>60-90 сек</strong> - для средних нагрузок</li>
            <li>• <strong>2-3 мин</strong> - для тяжелых базовых упражнений</li>
            <li>• <strong>3-5 мин</strong> - для максимальных весов</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}