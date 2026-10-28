import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export function getErrorMessage(error) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    const field = first.loc?.[first.loc.length - 1]
    return field ? `${field}: ${first.msg}` : first.msg
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server'
  }

  return 'Something went wrong. Please try again.'
}

export default api