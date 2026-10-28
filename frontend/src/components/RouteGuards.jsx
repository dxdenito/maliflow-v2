import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app">
      <Loader2 size={28} className="animate-spin text-brand" />
    </div>
  )
}

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}