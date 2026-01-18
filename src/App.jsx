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

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/competency" element={<Competency />} />
            <Route path="/kpi" element={<KPI />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/honor" element={<Honor />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
