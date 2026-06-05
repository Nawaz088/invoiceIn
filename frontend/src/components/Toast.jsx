import { useApp } from '../context/AppContext'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
}

export default function Toast() {
  const { toast } = useApp()
  
  if (!toast) return null
  
  const Icon = icons[toast.type] || icons.success
  
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
        ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
        ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
        ${toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}
      `}>
        <Icon size={20} className={`
          ${toast.type === 'success' ? 'text-green-500' : ''}
          ${toast.type === 'error' ? 'text-red-500' : ''}
          ${toast.type === 'warning' ? 'text-amber-500' : ''}
        `} />
        <span className="font-medium">{toast.message}</span>
      </div>
    </div>
  )
}
