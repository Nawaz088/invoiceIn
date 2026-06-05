import { useApp } from '../context/AppContext'
import { X, Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import clsx from 'clsx'

export default function Notifications() {
  const { state, dispatch } = useApp()
  
  if (state.notifications.length === 0) return null
  
  return (
    <div className="fixed top-20 right-6 z-[100] w-80 space-y-2">
      {state.notifications.map((notification) => (
        <div
          key={notification.id}
          className={clsx(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-slide-up',
            notification.type === 'success' && 'bg-green-50 border-green-200',
            notification.type === 'error' && 'bg-red-50 border-red-200',
            notification.type === 'warning' && 'bg-amber-50 border-amber-200',
            notification.type === 'info' && 'bg-blue-50 border-blue-200'
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notification.type === 'success' && <CheckCircle size={18} className="text-green-500" />}
            {notification.type === 'error' && <AlertTriangle size={18} className="text-red-500" />}
            {notification.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
            {notification.type === 'info' && <Info size={18} className="text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{notification.message}</p>
            <p className="text-xs text-gray-500 mt-0.5">{notification.timestamp}</p>
          </div>
          <button
            onClick={() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id })}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
