import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function Layout({ children }) {
  return (
    <div>
      <Header />
      <div className="container">
        <Sidebar />
        <main className="main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

