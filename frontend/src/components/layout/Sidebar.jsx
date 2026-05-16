import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Map, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  X 
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Tooltip } from '../ui'

const Sidebar = ({ 
  navItems = [], 
  isCollapsed, 
  onToggle, 
  isMobileOpen, 
  onMobileClose 
}) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path
    const Icon = item.icon

    const content = (
      <div
        onClick={() => {
          navigate(item.path)
          if (isMobileOpen) onMobileClose()
        }}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer group
          ${isActive 
            ? 'text-white bg-primary-600' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }
          ${isCollapsed ? 'justify-center px-0' : ''}
        `}
      >
        <Icon size={20} className={isCollapsed ? '' : 'shrink-0'} />
        
        {!isCollapsed && (
          <span className="flex-1 truncate">{item.label}</span>
        )}

        {!isCollapsed && item.badge && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-[10px] text-white font-bold">
            {item.badge}
          </span>
        )}

        {isCollapsed && item.badge && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full border-2 border-slate-900" />
        )}
      </div>
    )

    if (isCollapsed) {
      return (
        <Tooltip content={item.label} position="right">
          {content}
        </Tooltip>
      )
    }

    return content
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] md:hidden animate-fadeIn"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-slate-900 z-[70] flex flex-col transition-all duration-250 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-[var(--sidebar-width)]' : '-translate-x-full md:translate-x-0'}
          ${!isMobileOpen && isCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'}
        `}
      >
        {/* Top Section: Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <Map size={20} className="text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-white font-bold text-lg tracking-tight animate-fadeIn">
                UrbanMap
              </span>
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button 
              onClick={onMobileClose}
              className="ml-auto p-1 text-slate-400 hover:text-white md:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-1 custom-scrollbar">
          {navItems.map((item, idx) => (
            <NavItem key={idx} item={item} />
          ))}
        </nav>

        {/* Bottom Section: User Info */}
        <div className="mt-auto p-3 border-t border-slate-800">
          <div className={`
            flex items-center gap-3 p-2 rounded-xl transition-colors
            ${isCollapsed && !isMobileOpen ? 'justify-center' : 'bg-slate-800/50'}
          `}>
            <Avatar name={user?.name} size={isCollapsed && !isMobileOpen ? 'sm' : 'md'} />
            
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 min-w-0 animate-fadeIn">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-accent-400 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>

          {isCollapsed && !isMobileOpen && (
             <button 
             onClick={handleLogout}
             className="w-full mt-2 flex justify-center p-2 text-slate-400 hover:text-accent-400 transition-colors"
           >
             <LogOut size={18} />
           </button>
          )}
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white transition-colors z-[80]"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  )
}

export default Sidebar
