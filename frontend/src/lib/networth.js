import api from './api'

export async function fetchNetWorth() {
  const { data } = await api.get('/networth')
  return data
}