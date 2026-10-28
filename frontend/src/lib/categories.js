import api from './api'

export async function fetchCategories(includeInactive = false) {
  const { data } = await api.get('/categories', {
    params: { include_inactive: includeInactive },
  })
  return data
}

export async function createCategory(payload) {
  const { data } = await api.post('/categories', payload)
  return data
}

export async function updateCategory(categoryId, payload) {
  const { data } = await api.patch(`/categories/${categoryId}`, payload)
  return data
}