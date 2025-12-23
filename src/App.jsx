import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Recruitment from './pages/Recruitment'
import EmployeeStatusHistory from './pages/EmployeeStatusHistory'
import Salary from './pages/Salary'
import Competency from './pages/Competency'
import KPI from './pages/KPI'
import Tasks from './pages/Tasks'
import Attendance from './pages/Attendance'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/status-history" element={<EmployeeStatusHistory />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/competency" element={<Competency />} />
          <Route path="/kpi" element={<KPI />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/attendance" element={<Attendance />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

