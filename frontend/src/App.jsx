import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { ProtectedRoute, PublicRoute } from './components/RouteGuards'
import { mainNav } from './config/navigation'
import Accounts from './pages/Accounts'
import Budget from './pages/Budget'
import Expenses from './pages/Expenses'
import Home from './pages/Home'
import Income from './pages/Income'
import Investments from './pages/Investments'
import Ledger from './pages/Ledger'
import Login from './pages/Login'
import More from './pages/More'
import Obligations from './pages/Obligations'
import Placeholder from './pages/Placeholder'
import Purchases from './pages/Purchases'
import Register from './pages/Register'
import Reports from './pages/Reports'
import Savings from './pages/Savings'

const builtRoutes = [
  '/',
  '/accounts',
  '/budget',
  '/expenses',
  '/income',
  '/investments',
  '/ledger',
  '/obligations',
  '/purchases',
  '/reports',
  '/savings',
]

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/income" element={<Income />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/obligations" element={<Obligations />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/savings" element={<Savings />} />
            {mainNav
              .filter((item) => !builtRoutes.includes(item.to))
              .map((item) => (
                <Route
                  key={item.to}
                  path={item.to}
                  element={
                    <Placeholder
                      title={item.label}
                      description={item.description}
                    />
                  }
                />
              ))}
            <Route path="/more" element={<More />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App