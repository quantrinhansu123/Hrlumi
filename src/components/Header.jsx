import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Determine display name: name -> email -> 'N/A'
  const displayName = user?.name || user?.email || 'N/A'
  // Initial for avatar: first letter of name or email
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="header">
      <div className="logo">
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          color: '#fff',
          marginRight: '15px'
        }}>
          <i className="fas fa-plane-departure"></i>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0, lineHeight: 1 }}>CẢNG HÀNG KHÔNG</h1>
          <span style={{ fontSize: '0.8rem', opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase' }}>Quốc Tế</span>
        </div>
      </div>

      <div className="user-info" style={{ gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '600' }}>{displayName}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</div>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>
            {initial}
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Đăng xuất"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,0,0,0.4)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </header>
  )
}

export default Header

