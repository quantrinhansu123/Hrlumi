import { Link, useLocation } from 'react-router-dom'

function Sidebar() {
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard', icon: 'fas fa-home', label: 'Tổng quan' },
    { path: '/employees', icon: 'fas fa-users', label: 'Hồ sơ nhân sự' },
    { path: '/recruitment', icon: 'fas fa-user-plus', label: 'Tuyển dụng' },
    { path: '/salary', icon: 'fas fa-dollar-sign', label: 'Bậc lương & Thăng tiến' },
    { path: '/competency', icon: 'fas fa-graduation-cap', label: 'Năng lực nhân sự' },
    { path: '/kpi', icon: 'fas fa-bullseye', label: 'KPI' },
    { path: '/tasks', icon: 'fas fa-clipboard-list', label: 'Giao việc' },
    { path: '/attendance', icon: 'fas fa-clock', label: 'Chấm công & Lương' },
    { path: '/honor', icon: 'fas fa-medal', label: 'Tôn vinh' },
  ]

  return (
    <aside className="sidebar">
      {menuItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <i className={item.icon}></i>
          <span>{item.label}</span>
        </Link>
      ))}
    </aside>
  )
}

export default Sidebar
