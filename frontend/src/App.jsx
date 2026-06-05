import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import InvoiceBuilder from './pages/InvoiceBuilder'
import Clients from './pages/Clients'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import Toast from './components/Toast'
import Notifications from './components/Notifications'

function ProtectedRoute({ children }) {
  const { state } = useApp()
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function PublicRoute({ children }) {
  const { state } = useApp()
  
  if (state.isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceBuilder />} />
          <Route path="invoices/:id" element={<InvoiceBuilder />} />
          <Route path="clients" element={<Clients />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <Notifications />
    </>
  )
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
