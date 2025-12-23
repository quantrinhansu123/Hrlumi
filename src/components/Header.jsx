import React from 'react'

function Header() {
  return (
    <header className="header">
      <div className="logo">
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#00b14f'
        }}>
          L
        </div>
        <h1>LUMI <span>GLOBAL</span> Admin</h1>
      </div>
      <div className="user-info">
        <span>Admin</span>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00b14f',
          fontWeight: 'bold'
        }}>
          A
        </div>
      </div>
    </header>
  )
}

export default Header

