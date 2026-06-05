import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Plus
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { state, dispatch, showToast } = useApp()
  
  const user = state.user || {}

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    showToast('You have been logged out.', 'success')
    navigate('/login')
  }

  const handleQuickAdd = () => {
    navigate('/invoices/new')
  }

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Sidebar - Desktop */}
      <aside 
        className={clsx(
          "hidden lg:flex flex-col bg-primary text-white transition-all duration-300",
          sidebarOpen ? "w-60" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-display text-xl font-bold">InvoiceIN</h1>
                <p className="text-xs text-white/60">Smart Invoicing</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <Menu size={20} /> : ""}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* GST Threshold Warning */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 p-3 bg-warning/20 rounded-lg border border-warning/30 animate-fade-in">
            <p className="text-xs text-warning font-medium">GST Threshold Alert</p>
            <p className="text-xs text-white/60 mt-1">₹18.5L / ₹20L this FY</p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-warning rounded-full" style={{ width: '92.5%' }} />
            </div>
          </div>
        )}

        {/* User Section */}
        <div className="p-3 border-t border-white/10">
          <div className={clsx(
            "flex items-center gap-3 p-3 rounded-lg bg-white/5",
            sidebarOpen ? "" : "justify-center"
          )}>
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-white">
                {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="font-medium text-sm truncate">{user.name || 'User'}</p>
                <p className="text-xs text-accent-light">{user.plan || 'Free'} Plan</p>
              </div>
            )}
            {sidebarOpen && (
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={clsx(
          "lg:hidden fixed left-0 top-0 h-full w-72 bg-primary text-white z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">InvoiceIN</h1>
              <p className="text-xs text-white/60">Smart Invoicing</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <span className="font-semibold text-white">
                {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{user.name || 'User'}</p>
              <p className="text-xs text-accent-light">{user.plan || 'Free'} Plan</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/10">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border-light">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden btn-icon text-text-secondary"
                >
                  <Menu size={24} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative btn-icon text-text-secondary hover:bg-secondary">
                  <Bell size={20} />
                  {state.notifications?.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
                  )}
                </button>

                {/* Quick Add */}
                <button onClick={handleQuickAdd} className="btn btn-primary hidden sm:flex">
                  <Plus size={16} />
                  New Invoice
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 gradient-mesh">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
