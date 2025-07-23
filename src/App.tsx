import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Dumbbell, Plus, Play, Timer, Database, Zap, BarChart3 } from 'lucide-react'
import ExerciseDatabase from './components/ExerciseDatabase'
import WorkoutGenerator from './components/WorkoutGenerator'
import ActiveWorkout from './components/ActiveWorkout'
import ExerciseTimer from './components/ExerciseTimer'
import WorkoutHistory from './components/WorkoutHistory'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('database')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <Dumbbell className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Smart Workout Planner</CardTitle>
            <CardDescription>
              Персональный планировщик тренировок с базой упражнений
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => blink.auth.login()} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Войти в приложение
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Dumbbell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Smart Workout</h1>
                <p className="text-sm text-slate-500">Планировщик тренировок</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600">Привет, {user.email}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => blink.auth.logout()}
              >
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-slate-200">
            <TabsTrigger value="database" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">База упражнений</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Генератор</span>
            </TabsTrigger>
            <TabsTrigger value="workout" className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Тренировка</span>
            </TabsTrigger>
            <TabsTrigger value="timer" className="flex items-center space-x-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Таймер</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-6">
            <ExerciseDatabase />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <WorkoutGenerator />
          </TabsContent>

          <TabsContent value="workout" className="space-y-6">
            <ActiveWorkout />
          </TabsContent>

          <TabsContent value="timer" className="space-y-6">
            <ExerciseTimer />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <WorkoutHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App