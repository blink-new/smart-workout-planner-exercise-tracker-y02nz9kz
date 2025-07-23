import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Edit, Trash2, Plus, Search } from 'lucide-react'
import { blink } from '../blink/client'
import { Exercise, MUSCLE_GROUPS, WEIGHT_TYPES, EXERCISE_TYPES } from '../types'

export default function ExerciseDatabase() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  // Форма для добавления/редактирования упражнения
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: '',
    weight_type: '',
    technique: '',
    equipment_settings: '',
    exercise_type: '',
    equipment_name: '',
    equipment_photo_url: '',
    default_sets: 3,
    default_reps: 10
  })

  // Функция для извлечения значения из объекта Blink DB
  const getValue = (obj: any): any => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value
    }
    return obj
  }

  // Загрузка упражнений
  const loadExercises = useCallback(async () => {
    try {
      console.log('🔄 Начинаем загрузку упражнений...')
      setLoading(true)

      // Получаем данные пользователя
      const user = await blink.auth.me()
      if (!user?.id) {
        console.error('❌ Пользователь не авторизован')
        return
      }

      console.log('👤 Пользователь:', user.id)

      // Загружаем упражнения из базы данных
      const result = await blink.db.sql(`
        SELECT * FROM exercises 
        WHERE user_id = '${user.id}' 
        ORDER BY created_at DESC
      `)

      console.log('📊 Результат запроса:', result)

      if (result && Array.isArray(result)) {
        // Преобразуем данные из формата Blink DB
        const exercisesList: Exercise[] = result.map((row: any) => ({
          id: getValue(row.id),
          user_id: getValue(row.user_id),
          name: getValue(row.name),
          muscle_group: getValue(row.muscle_group),
          weight_type: getValue(row.weight_type),
          technique: getValue(row.technique),
          equipment_settings: getValue(row.equipment_settings),
          exercise_type: getValue(row.exercise_type),
          equipment_name: getValue(row.equipment_name),
          equipment_photo_url: getValue(row.equipment_photo_url),
          created_at: getValue(row.created_at),
          updated_at: getValue(row.updated_at),
          default_sets: parseInt(getValue(row.default_sets)) || 3,
          default_reps: parseInt(getValue(row.default_reps)) || 10
        }))

        console.log('✅ Упражнения загружены:', exercisesList.length)
        setExercises(exercisesList)
      } else {
        console.log('📝 Упражнения не найдены')
        setExercises([])
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки упражнений:', error)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Добавление упражнения
  const handleAddExercise = async () => {
    try {
      console.log('➕ Добавляем упражнение:', formData)

      // Валидация обязательных полей
      if (!formData.name.trim()) {
        alert('Название упражнения обязательно!')
        return
      }
      if (!formData.muscle_group) {
        alert('Группа мышц обязательна!')
        return
      }
      if (!formData.technique.trim()) {
        alert('Техника выполнения обязательна!')
        return
      }
      if (!formData.weight_type) {
        alert('Тип веса обязателен!')
        return
      }
      if (!formData.exercise_type) {
        alert('Тип упражнения обязателен!')
        return
      }

      const user = await blink.auth.me()
      if (!user?.id) {
        alert('Ошибка авторизации!')
        return
      }

      const exerciseId = `exercise_${Date.now()}`
      const now = new Date().toISOString()

      // Создаем SQL запрос для добавления упражнения
      const query = `
        INSERT INTO exercises (
          id, user_id, name, muscle_group, weight_type, technique, 
          equipment_settings, exercise_type, equipment_name, equipment_photo_url,
          created_at, updated_at, default_sets, default_reps
        ) VALUES (
          '${exerciseId}',
          '${user.id}',
          '${formData.name.replace(/'/g, "''")}',
          '${formData.muscle_group}',
          '${formData.weight_type}',
          '${formData.technique.replace(/'/g, "''")}',
          ${formData.equipment_settings ? `'${formData.equipment_settings.replace(/'/g, "''")}'` : 'NULL'},
          '${formData.exercise_type}',
          ${formData.equipment_name ? `'${formData.equipment_name.replace(/'/g, "''")}'` : 'NULL'},
          ${formData.equipment_photo_url ? `'${formData.equipment_photo_url}'` : 'NULL'},
          '${now}',
          '${now}',
          ${formData.default_sets},
          ${formData.default_reps}
        )
      `

      console.log('📝 SQL запрос:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат добавления:', result)

      // Очищаем форму
      setFormData({
        name: '',
        muscle_group: '',
        weight_type: '',
        technique: '',
        equipment_settings: '',
        exercise_type: '',
        equipment_name: '',
        equipment_photo_url: '',
        default_sets: 3,
        default_reps: 10
      })

      // Закрываем диалог
      setIsAddDialogOpen(false)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно добавлено!')
    } catch (error) {
      console.error('❌ Ошибка добавления упражнения:', error)
      alert('Ошибка при добавлении упражнения!')
    }
  }

  // Редактирование упражнения
  const handleEditExercise = async () => {
    try {
      if (!editingExercise) return

      console.log('✏️ Редактируем упражнение:', formData)

      // Валидация обязательных полей
      if (!formData.name.trim()) {
        alert('Название упражнения обязательно!')
        return
      }
      if (!formData.muscle_group) {
        alert('Группа мышц обязательна!')
        return
      }
      if (!formData.technique.trim()) {
        alert('Техника выполнения обязательна!')
        return
      }

      const now = new Date().toISOString()

      const query = `
        UPDATE exercises SET
          name = '${formData.name.replace(/'/g, "''")}',
          muscle_group = '${formData.muscle_group}',
          weight_type = '${formData.weight_type}',
          technique = '${formData.technique.replace(/'/g, "''")}',
          equipment_settings = ${formData.equipment_settings ? `'${formData.equipment_settings.replace(/'/g, "''")}'` : 'NULL'},
          exercise_type = '${formData.exercise_type}',
          equipment_name = ${formData.equipment_name ? `'${formData.equipment_name.replace(/'/g, "''")}'` : 'NULL'},
          equipment_photo_url = ${formData.equipment_photo_url ? `'${formData.equipment_photo_url}'` : 'NULL'},
          updated_at = '${now}',
          default_sets = ${formData.default_sets},
          default_reps = ${formData.default_reps}
        WHERE id = '${editingExercise.id}'
      `

      console.log('📝 SQL запрос обновления:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат обновления:', result)

      // Закрываем диалог
      setIsEditDialogOpen(false)
      setEditingExercise(null)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно обновлено!')
    } catch (error) {
      console.error('❌ Ошибка редактирования упражнения:', error)
      alert('Ошибка при редактировании упражнения!')
    }
  }

  // Удаление упражнения
  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      console.log('🗑️ Удаляем упражнение:', exerciseId)

      const query = `DELETE FROM exercises WHERE id = '${exerciseId}'`
      console.log('📝 SQL запрос удаления:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат удаления:', result)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно удалено!')
    } catch (error) {
      console.error('❌ Ошибка удаления упражнения:', error)
      alert('Ошибка при удалении упражнения!')
    }
  }

  // Открытие диалога редактирования
  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      weight_type: exercise.weight_type,
      technique: exercise.technique,
      equipment_settings: exercise.equipment_settings || '',
      exercise_type: exercise.exercise_type,
      equipment_name: exercise.equipment_name || '',
      equipment_photo_url: exercise.equipment_photo_url || '',
      default_sets: exercise.default_sets,
      default_reps: exercise.default_reps
    })
    setIsEditDialogOpen(true)
  }

  // Фильтрация упражнений
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMuscleGroup = selectedMuscleGroup === 'all' || exercise.muscle_group === selectedMuscleGroup
    return matchesSearch && matchesMuscleGroup
  })

  // Загрузка упражнений при монтировании компонента
  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  // Функция для получения цвета бейджа типа упражнения
  const getExerciseTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800'
      case 'auxiliary': return 'bg-orange-100 text-orange-800'
      case 'isolated': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Функция для получения русского названия типа упражнения
  const getExerciseTypeLabel = (type: string) => {
    switch (type) {
      case 'primary': return 'Основное'
      case 'auxiliary': return 'Вспомогательное'
      case 'isolated': return 'Изолированное'
      default: return type
    }
  }

  // Функция для получения русского названия типа веса
  const getWeightTypeLabel = (type: string) => {
    switch (type) {
      case 'bodyweight': return 'Свой вес'
      case 'additional': return 'Дополнительный вес'
      case 'assisted': return 'Антивес'
      default: return type
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">База упражнений</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Добавить упражнение
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить новое упражнение</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название упражнения *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Жим лежа"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="muscle_group">Группа мышц *</Label>
                <Select value={formData.muscle_group} onValueChange={(value) => setFormData({ ...formData, muscle_group: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу мышц" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_type">Тип веса *</Label>
                <Select value={formData.weight_type} onValueChange={(value) => setFormData({ ...formData, weight_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип веса" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bodyweight">Свой вес</SelectItem>
                    <SelectItem value="additional">Дополнительный вес</SelectItem>
                    <SelectItem value="assisted">Антивес</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise_type">Тип упражнения *</Label>
                <Select value={formData.exercise_type} onValueChange={(value) => setFormData({ ...formData, exercise_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип упражнения" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Основное</SelectItem>
                    <SelectItem value="auxiliary">Вспомогательное</SelectItem>
                    <SelectItem value="isolated">Изолированное</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_sets">Подходы</Label>
                <Input
                  id="default_sets"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.default_sets}
                  onChange={(e) => setFormData({ ...formData, default_sets: parseInt(e.target.value) || 3 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_reps">Повторения</Label>
                <Input
                  id="default_reps"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.default_reps}
                  onChange={(e) => setFormData({ ...formData, default_reps: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment_name">Название тренажера</Label>
                <Input
                  id="equipment_name"
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="Например: Штанга, Гантели"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment_photo_url">Фото тренажера (URL)</Label>
                <Input
                  id="equipment_photo_url"
                  value={formData.equipment_photo_url}
                  onChange={(e) => setFormData({ ...formData, equipment_photo_url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="technique">Техника выполнения *</Label>
                <Textarea
                  id="technique"
                  value={formData.technique}
                  onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                  placeholder="Опишите технику выполнения упражнения..."
                  rows={3}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="equipment_settings">Настройки тренажера</Label>
                <Textarea
                  id="equipment_settings"
                  value={formData.equipment_settings}
                  onChange={(e) => setFormData({ ...formData, equipment_settings: e.target.value })}
                  placeholder="Настройки тренажера, высота сиденья и т.д."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddExercise}>
                Добавить упражнение
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Поиск и фильтры */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск упражнений..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все группы мышц" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы мышц</SelectItem>
            {MUSCLE_GROUPS.map(group => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Список упражнений */}
      {loading ? (
        <div className="text-center py-8">
          <p>Загрузка упражнений...</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            {exercises.length === 0 
              ? "Упражнения не найдены. Добавьте первое упражнение!" 
              : "Упражнения не найдены по заданным фильтрам."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{exercise.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(exercise)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить упражнение?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Упражнение "{exercise.name}" будет удалено навсегда.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteExercise(exercise.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{exercise.muscle_group}</Badge>
                  <Badge className={getExerciseTypeBadgeColor(exercise.exercise_type)}>
                    {getExerciseTypeLabel(exercise.exercise_type)}
                  </Badge>
                  <Badge variant="outline">{getWeightTypeLabel(exercise.weight_type)}</Badge>
                  <Badge variant="outline">{exercise.default_sets} × {exercise.default_reps}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Техника выполнения:</h4>
                    <p className="text-sm text-gray-600">{exercise.technique}</p>
                  </div>
                  {exercise.equipment_name && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Оборудование:</h4>
                      <p className="text-sm text-gray-600">{exercise.equipment_name}</p>
                    </div>
                  )}
                  {exercise.equipment_settings && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Настройки:</h4>
                      <p className="text-sm text-gray-600">{exercise.equipment_settings}</p>
                    </div>
                  )}
                  {exercise.equipment_photo_url && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Фото:</h4>
                      <img 
                        src={exercise.equipment_photo_url} 
                        alt={exercise.equipment_name || 'Тренажер'}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать упражнение</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Название упражнения *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Жим лежа"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_muscle_group">Группа мышц *</Label>
              <Select value={formData.muscle_group} onValueChange={(value) => setFormData({ ...formData, muscle_group: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу мышц" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_weight_type">Тип веса *</Label>
              <Select value={formData.weight_type} onValueChange={(value) => setFormData({ ...formData, weight_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип веса" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bodyweight">Свой вес</SelectItem>
                  <SelectItem value="additional">Дополнительный вес</SelectItem>
                  <SelectItem value="assisted">Антивес</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_exercise_type">Тип упражнения *</Label>
              <Select value={formData.exercise_type} onValueChange={(value) => setFormData({ ...formData, exercise_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип упражнения" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Основное</SelectItem>
                  <SelectItem value="auxiliary">Вспомогательное</SelectItem>
                  <SelectItem value="isolated">Изолированное</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_default_sets">Подходы</Label>
              <Input
                id="edit_default_sets"
                type="number"
                min="1"
                max="10"
                value={formData.default_sets}
                onChange={(e) => setFormData({ ...formData, default_sets: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_default_reps">Повторения</Label>
              <Input
                id="edit_default_reps"
                type="number"
                min="1"
                max="50"
                value={formData.default_reps}
                onChange={(e) => setFormData({ ...formData, default_reps: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_equipment_name">Название тренажера</Label>
              <Input
                id="edit_equipment_name"
                value={formData.equipment_name}
                onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                placeholder="Например: Штанга, Гантели"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_equipment_photo_url">Фото тренажера (URL)</Label>
              <Input
                id="edit_equipment_photo_url"
                value={formData.equipment_photo_url}
                onChange={(e) => setFormData({ ...formData, equipment_photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_technique">Техника выполнения *</Label>
              <Textarea
                id="edit_technique"
                value={formData.technique}
                onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                placeholder="Опишите технику выполнения упражнения..."
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_equipment_settings">Настройки тренажера</Label>
              <Textarea
                id="edit_equipment_settings"
                value={formData.equipment_settings}
                onChange={(e) => setFormData({ ...formData, equipment_settings: e.target.value })}
                placeholder="Настройки тренажера, высота сиденья и т.д."
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditExercise}>
              Сохранить изменения
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}