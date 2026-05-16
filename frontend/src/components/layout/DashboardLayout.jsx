import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui'
import Sidebar from './Sidebar'

const DashboardLayout = ({ navItems = [], children, pageTitle }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar 
        navItems={navItems}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col overflow-hidden transition-all duration-250 ease-in-out
          ${isCollapsed ? 'md:ml-[var(--sidebar-collapsed-width)]' : 'md:ml-[var(--sidebar-width)]'}
        `}
      >
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0">
          {/* Mobile Hamburger */}
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg md:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Page Title */}
          {pageTitle && (
            <h1 className="text-lg font-semibold text-slate-800 truncate">
              {pageTitle}
            </h1>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Profile Summary */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              {user?.name}
            </span>
            <Avatar name={user?.name} size="sm" />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
