import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Attendance from './pages/Attendance'
import Competency from './pages/Competency'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Honor from './pages/Honor'
import KPI from './pages/KPI'
import Recruitment from './pages/Recruitment'
import Salary from './pages/Salary'
import Tasks from './pages/Tasks'

function App() {
  return (
    <BrowserRouter>
      <Layout>
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
      </Layout>
    </BrowserRouter>
  )
}

export default App
