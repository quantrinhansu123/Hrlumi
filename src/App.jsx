import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy load pages
const Attendance = lazy(() => import('./pages/Attendance'))
const Competency = lazy(() => import('./pages/Competency'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Honor = lazy(() => import('./pages/Honor'))
const KPI = lazy(() => import('./pages/KPI'))
const Recruitment = lazy(() => import('./pages/Recruitment'))
const Salary = lazy(() => import('./pages/Salary'))
const Tasks = lazy(() => import('./pages/Tasks'))
const GradingPage = lazy(() => import('./pages/GradingPage'))
const Login = lazy(() => import('./pages/Login'))

import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/recruitment" element={<Recruitment />} />
                    <Route path="/salary" element={<Salary />} />
                    <Route path="/competency" element={<Competency />} />
                    <Route path="/kpi" element={<KPI />} />
                    <Route path="/grading/:employeeId?" element={<GradingPage />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/honor" element={<Honor />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
