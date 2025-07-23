import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react'
import { blink } from '../blink/client'
import { Exercise, MUSCLE_GROUPS, WEIGHT_TYPES, EXERCISE_TYPES } from '../types'

export default function ExerciseDatabase() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  // Форма для добавления/редактирования упражнения
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: '',
    weight_type: 'Свой вес',
    technique: '',
    equipment_settings: '',
    exercise_type: 'Основное',
    equipment_name: '',
    equipment_photo_url: '',
    default_sets: 3,
    default_reps: 10
  })

  // Загрузка упражнений
  const loadExercises = async () => {
    try {
      console.log('🔄 Начинаем загрузку упражнений...')
      setLoading(true)

      // Получаем текущего пользователя
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
        // Преобразуем результат в правильный формат
        const exercisesList: Exercise[] = result.map((row: any) => ({
          id: row.id?.value || row.id,
          user_id: row.user_id?.value || row.user_id,
          name: row.name?.value || row.name,
          muscle_group: row.muscle_group?.value || row.muscle_group,
          weight_type: row.weight_type?.value || row.weight_type,
          technique: row.technique?.value || row.technique,
          equipment_settings: row.equipment_settings?.value || row.equipment_settings || '',
          exercise_type: row.exercise_type?.value || row.exercise_type,
          equipment_name: row.equipment_name?.value || row.equipment_name || '',
          equipment_photo_url: row.equipment_photo_url?.value || row.equipment_photo_url || '',
          created_at: row.created_at?.value || row.created_at,
          updated_at: row.updated_at?.value || row.updated_at,
          default_sets: parseInt(row.default_sets?.value || row.default_sets || '3'),
          default_reps: parseInt(row.default_reps?.value || row.default_reps || '10')
        }))

        console.log('✅ Упражнения загружены:', exercisesList.length)
        setExercises(exercisesList)
      } else {
        console.log('📝 Упражнений не найдено')
        setExercises([])
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки упражнений:', error)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }

  // Добавление упражнения
  const handleAddExercise = async () => {
    try {
      console.log('➕ Добавляем упражнение:', formData)

      // Проверяем обязательные поля
      if (!formData.name.trim()) {
        alert('Введите название упражнения')
        return
      }
      if (!formData.muscle_group) {
        alert('Выберите группу мышц')
        return
      }
      if (!formData.technique.trim()) {
        alert('Введите технику выполнения')
        return
      }

      // Получаем текущего пользователя
      const user = await blink.auth.me()
      if (!user?.id) {
        alert('Ошибка авторизации')
        return
      }

      // Генерируем ID для упражнения
      const exerciseId = `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Создаем SQL запрос для добавления упражнения
      const query = `
        INSERT INTO exercises (
          id, user_id, name, muscle_group, weight_type, technique, 
          equipment_settings, exercise_type, equipment_name, 
          equipment_photo_url, default_sets, default_reps, 
          created_at, updated_at
        ) VALUES (
          '${exerciseId}',
          '${user.id}',
          '${formData.name.replace(/'/g, "''")}',
          '${formData.muscle_group}',
          '${formData.weight_type}',
          '${formData.technique.replace(/'/g, "''")}',
          '${formData.equipment_settings.replace(/'/g, "''")}',
          '${formData.exercise_type}',
          '${formData.equipment_name.replace(/'/g, "''")}',
          '${formData.equipment_photo_url}',
          ${formData.default_sets},
          ${formData.default_reps},
          datetime('now'),
          datetime('now')
        )
      `

      console.log('📝 SQL запрос:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат добавления:', result)

      // Сбрасываем форму
      setFormData({
        name: '',
        muscle_group: '',
        weight_type: 'Свой вес',
        technique: '',
        equipment_settings: '',
        exercise_type: 'Основное',
        equipment_name: '',
        equipment_photo_url: '',
        default_sets: 3,
        default_reps: 10
      })

      // Закрываем диалог
      setShowAddDialog(false)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно добавлено!')

    } catch (error) {
      console.error('❌ Ошибка добавления упражнения:', error)
      alert('Ошибка при добавлении упражнения: ' + error.message)
    }
  }

  // Редактирование упражнения
  const handleEditExercise = async () => {
    try {
      if (!editingExercise) return

      console.log('✏️ Редактируем упражнение:', formData)

      // Проверяем обязательные поля
      if (!formData.name.trim()) {
        alert('Введите название упражнения')
        return
      }
      if (!formData.muscle_group) {
        alert('Выберите группу мышц')
        return
      }
      if (!formData.technique.trim()) {
        alert('Введите технику выполнения')
        return
      }

      // Создаем SQL запрос для обновления упражнения
      const query = `
        UPDATE exercises SET
          name = '${formData.name.replace(/'/g, "''")}',
          muscle_group = '${formData.muscle_group}',
          weight_type = '${formData.weight_type}',
          technique = '${formData.technique.replace(/'/g, "''")}',
          equipment_settings = '${formData.equipment_settings.replace(/'/g, "''")}',
          exercise_type = '${formData.exercise_type}',
          equipment_name = '${formData.equipment_name.replace(/'/g, "''")}',
          equipment_photo_url = '${formData.equipment_photo_url}',
          default_sets = ${formData.default_sets},
          default_reps = ${formData.default_reps},
          updated_at = datetime('now')
        WHERE id = '${editingExercise.id}'
      `

      console.log('📝 SQL запрос:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат редактирования:', result)

      // Закрываем диалог
      setShowEditDialog(false)
      setEditingExercise(null)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно обновлено!')

    } catch (error) {
      console.error('❌ Ошибка редактирования упражнения:', error)
      alert('Ошибка при редактировании упражнения: ' + error.message)
    }
  }

  // Удаление упражнения
  const handleDeleteExercise = async (exercise: Exercise) => {
    try {
      if (!confirm(`Вы уверены, что хотите удалить упражнение "${exercise.name}"?`)) {
        return
      }

      console.log('🗑️ Удаляем упражнение:', exercise.id)

      const query = `DELETE FROM exercises WHERE id = '${exercise.id}'`
      console.log('📝 SQL запрос:', query)

      const result = await blink.db.sql(query)
      console.log('✅ Результат удаления:', result)

      // Перезагружаем список упражнений
      await loadExercises()

      alert('Упражнение успешно удалено!')

    } catch (error) {
      console.error('❌ Ошибка удаления упражнения:', error)
      alert('Ошибка при удалении упражнения: ' + error.message)
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
    setShowEditDialog(true)
  }

  // Фильтрация упражнений
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMuscleGroup = !selectedMuscleGroup || exercise.muscle_group === selectedMuscleGroup
    return matchesSearch && matchesMuscleGroup
  })

  // Загрузка упражнений при монтировании компонента
  useEffect(() => {
    loadExercises()
  }, [])

  // Получение цвета бейджа для типа упражнения
  const getExerciseTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Основное': return 'bg-blue-100 text-blue-800'
      case 'Вспомогательное': return 'bg-orange-100 text-orange-800'
      case 'Изолированное': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">База упражнений</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить упражнение
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск упражнений..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedMuscleGroup}
          onChange={(e) => setSelectedMuscleGroup(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Все группы мышц</option>
          {MUSCLE_GROUPS.map(group => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </div>

      {/* Список упражнений */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка упражнений...</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {exercises.length === 0 ? 'Упражнения не найдены. Добавьте первое упражнение!' : 'Упражнения не найдены по заданным критериям.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <div key={exercise.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditDialog(exercise)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExercise(exercise)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {exercise.muscle_group}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getExerciseTypeBadgeColor(exercise.exercise_type)}`}>
                    {exercise.exercise_type}
                  </span>
                  <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {exercise.weight_type}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Подходы:</strong> {exercise.default_sets} × {exercise.default_reps}
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Техника:</strong> {exercise.technique}
                </div>

                {exercise.equipment_name && (
                  <div className="text-sm text-gray-600">
                    <strong>Тренажер:</strong> {exercise.equipment_name}
                  </div>
                )}

                {exercise.equipment_settings && (
                  <div className="text-sm text-gray-600">
                    <strong>Настройки:</strong> {exercise.equipment_settings}
                  </div>
                )}

                {exercise.equipment_photo_url && (
                  <div className="mt-3">
                    <img
                      src={exercise.equipment_photo_url}
                      alt={exercise.equipment_name || 'Тренажер'}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Диалог добавления упражнения */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Добавить упражнение</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название упражнения *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: Жим лежа"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Группа мышц *
                    </label>
                    <select
                      value={formData.muscle_group}
                      onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите группу мышц</option>
                      {MUSCLE_GROUPS.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип упражнения
                    </label>
                    <select
                      value={formData.exercise_type}
                      onChange={(e) => setFormData({...formData, exercise_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {EXERCISE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип веса
                  </label>
                  <select
                    value={formData.weight_type}
                    onChange={(e) => setFormData({...formData, weight_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {WEIGHT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Подходы по умолчанию
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.default_sets}
                      onChange={(e) => setFormData({...formData, default_sets: parseInt(e.target.value) || 3})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Повторения по умолчанию
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.default_reps}
                      onChange={(e) => setFormData({...formData, default_reps: parseInt(e.target.value) || 10})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Техника выполнения *
                  </label>
                  <textarea
                    value={formData.technique}
                    onChange={(e) => setFormData({...formData, technique: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Опишите технику выполнения упражнения"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название тренажера
                  </label>
                  <input
                    type="text"
                    value={formData.equipment_name}
                    onChange={(e) => setFormData({...formData, equipment_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: Скамья для жима"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Настройки тренажера
                  </label>
                  <textarea
                    value={formData.equipment_settings}
                    onChange={(e) => setFormData({...formData, equipment_settings: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Настройки высоты, угла наклона и т.д."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL фото тренажера
                  </label>
                  <input
                    type="url"
                    value={formData.equipment_photo_url}
                    onChange={(e) => setFormData({...formData, equipment_photo_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddExercise}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Добавить упражнение
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог редактирования упражнения */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Редактировать упражнение</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название упражнения *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: Жим лежа"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Группа мышц *
                    </label>
                    <select
                      value={formData.muscle_group}
                      onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите группу мышц</option>
                      {MUSCLE_GROUPS.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип упражнения
                    </label>
                    <select
                      value={formData.exercise_type}
                      onChange={(e) => setFormData({...formData, exercise_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {EXERCISE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип веса
                  </label>
                  <select
                    value={formData.weight_type}
                    onChange={(e) => setFormData({...formData, weight_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {WEIGHT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Подходы по умолчанию
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.default_sets}
                      onChange={(e) => setFormData({...formData, default_sets: parseInt(e.target.value) || 3})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Повторения по умолчанию
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.default_reps}
                      onChange={(e) => setFormData({...formData, default_reps: parseInt(e.target.value) || 10})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Техника выполнения *
                  </label>
                  <textarea
                    value={formData.technique}
                    onChange={(e) => setFormData({...formData, technique: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Опишите технику выполнения упражнения"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название тренажера
                  </label>
                  <input
                    type="text"
                    value={formData.equipment_name}
                    onChange={(e) => setFormData({...formData, equipment_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: Скамья для жима"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Настройки тренажера
                  </label>
                  <textarea
                    value={formData.equipment_settings}
                    onChange={(e) => setFormData({...formData, equipment_settings: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Настройки высоты, угла наклона и т.д."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL фото тренажера
                  </label>
                  <input
                    type="url"
                    value={formData.equipment_photo_url}
                    onChange={(e) => setFormData({...formData, equipment_photo_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditDialog(false)
                    setEditingExercise(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleEditExercise}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}