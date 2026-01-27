import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/dashboard', icon: 'fas fa-home', label: 'Tổng quan' },
    { path: '/employees', icon: 'fas fa-users', label: 'Hồ sơ nhân sự' },
    { path: '/recruitment', icon: 'fas fa-user-plus', label: 'Tuyển dụng' },
    { path: '/salary', icon: 'fas fa-money-bill-wave', label: 'Lương & Phúc lợi' },
    { path: '/competency', icon: 'fas fa-chart-line', label: 'Khung năng lực' },
    { path: '/kpi', icon: 'fas fa-bullseye', label: 'KPI' },
    { path: '/grading', icon: 'fas fa-star-half-alt', label: 'Chấm điểm' },
    { path: '/tasks', icon: 'fas fa-tasks', label: 'Công việc' },
    { path: '/attendance', icon: 'fas fa-clock', label: 'Chấm công' },
    { path: '/honor', icon: 'fas fa-medal', label: 'Vinh danh' }
  ]

  return (
    <aside className="sidebar">
      <div className="brand">
        <i className="fas fa-layer-group"></i>
        <span>HR Manager</span>
      </div>

      {menuItems.map(item => {
        // Handle external or special links if needed, logic from before
        const isExternal = item.path.startsWith('http');

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </Link>
        )
      })}

      <div
        className="nav-item"
        onClick={handleLogout}
        style={{ marginTop: 'auto', borderTop: '1px solid #eee', cursor: 'pointer', color: '#d32f2f' }}
      >
        <i className="fas fa-sign-out-alt"></i>
        <span>Đăng xuất</span>
      </div>
    </aside>
  )
}

export default Sidebar
