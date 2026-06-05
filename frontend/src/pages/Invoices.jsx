import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../services/api'
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Send,
  Copy,
  FileText,
  Download,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Loader2
} from 'lucide-react'
import clsx from 'clsx'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

function StatusBadge({ status }) {
  const styles = {
    draft: 'badge-draft',
    sent: 'badge-sent',
    paid: 'badge-paid',
    overdue: 'badge-overdue'
  }
  
  const icons = {
    draft: FileText,
    sent: Send,
    paid: CheckCircle,
    overdue: AlertTriangle
  }
  
  const Icon = icons[status] || FileText
  
  return (
    <span className={clsx('badge flex items-center gap-1.5', styles[status])}>
      <Icon size={12} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  )
}

function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-light rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
      >
        {options.find(o => o.value === value)?.label || label}
        <X 
          size={14} 
          className={value !== '' ? 'text-accent' : 'hidden'}
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
        />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border-light rounded-lg shadow-lg z-20 py-1 animate-scale-in">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={clsx(
                  "w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors",
                  value === option.value && "bg-secondary text-primary font-medium"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InvoiceRow({ invoice, onView, onEdit, onSend, onMarkPaid, onClone, onDelete, onDownloadPdf, loading }) {
  const [showActions, setShowActions] = useState(false)
  
  const clientName = invoice.client_name || invoice.client?.name || 'Unknown Client'
  const invoiceNumber = invoice.invoice_number || invoice.id
  const itemCount = invoice.items?.length || invoice.total_items || 0
  const totalAmount = invoice.total_amount || invoice.total || 0
  const status = invoice.status || 'draft'
  const dueDate = invoice.due_date || invoice.dueDate
  
  return (
    <tr className="table-row group">
      <td className="table-cell">
        <Link 
          to={`/invoices/${invoice.id}`}
          className="font-mono text-sm text-primary font-medium hover:text-accent transition-colors"
        >
          {invoiceNumber}
        </Link>
      </td>
      <td className="table-cell font-medium">{clientName}</td>
      <td className="table-cell">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="text-sm">{itemCount} items</span>
        </div>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-1 text-text-secondary">
          <span className="text-sm">{formatDate(invoice.issue_date || invoice.date)}</span>
        </div>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-1">
          <Clock size={14} className={status === 'overdue' ? 'text-danger' : 'text-text-muted'} />
          <span className={clsx(
            "text-sm",
            status === 'overdue' ? "text-danger font-medium" : "text-text-secondary"
          )}>
            {formatDate(dueDate)}
          </span>
        </div>
      </td>
      <td className="table-cell font-mono font-semibold">
        {formatCurrency(totalAmount)}
      </td>
      <td className="table-cell">
        <StatusBadge status={status} />
      </td>
      <td className="table-cell">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="btn-icon text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span className="sr-only">Actions</span>
            )}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            )}
          </button>
          
          {showActions && !loading && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border-light rounded-lg shadow-lg z-20 py-1 animate-scale-in">
                <button 
                  onClick={() => { onView(invoice); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <Eye size={16} />
                  View Invoice
                </button>
                <button 
                  onClick={() => { onEdit(invoice); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <Edit size={16} />
                  Edit Invoice
                </button>
                <button 
                  onClick={() => { onDownloadPdf(invoice); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <Download size={16} />
                  Download PDF
                </button>
                {status === 'draft' && (
                  <button 
                    onClick={() => { onSend(invoice); setShowActions(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-blue-600"
                  >
                    <Send size={16} />
                    Send Invoice
                  </button>
                )}
                {status !== 'paid' && (
                  <button 
                    onClick={() => { onMarkPaid(invoice); setShowActions(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-green-600"
                  >
                    <CheckCircle size={16} />
                    Mark as Paid
                  </button>
                )}
                <button 
                  onClick={() => { onClone(invoice); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <div className="border-t border-border-light my-1" />
                <button 
                  onClick={() => { onDelete(invoice); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ hasFilters }) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
        <FileText size={40} className="text-text-muted" />
      </div>
      <h3 className="font-display text-xl text-text-primary mb-2">
        {hasFilters ? 'No matching invoices' : 'No invoices found'}
      </h3>
      <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
        {hasFilters 
          ? 'No invoices match your search criteria. Try adjusting your filters.'
          : "You haven't created any invoices yet. Start by creating your first invoice."}
      </p>
      {hasFilters ? (
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Clear Filters
        </button>
      ) : (
        <Link to="/invoices/new" className="btn btn-primary">
          <Plus size={18} />
          Create Your First Invoice
        </Link>
      )}
    </div>
  )
}

function StatsBar({ invoices, loading }) {
  const stats = useMemo(() => {
    const filtered = invoices.filter(i => i)
    return {
      total: filtered.length,
      draft: filtered.filter(i => i.status === 'draft').length,
      sent: filtered.filter(i => i.status === 'sent').length,
      paid: filtered.filter(i => i.status === 'paid').length,
      overdue: filtered.filter(i => i.status === 'overdue').length,
      totalAmount: filtered.reduce((sum, i) => sum + (i.total_amount || i.total || 0), 0)
    }
  }, [invoices])
  
  if (loading) {
    return (
      <div className="flex flex-wrap gap-4 p-4 bg-secondary rounded-xl mb-6 animate-pulse">
        <div className="h-6 w-20 bg-gray-300 rounded"></div>
        <div className="h-6 w-20 bg-gray-300 rounded"></div>
        <div className="h-6 w-20 bg-gray-300 rounded"></div>
        <div className="h-6 w-20 bg-gray-300 rounded"></div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-secondary rounded-xl mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Total:</span>
        <span className="font-semibold text-text-primary">{stats.total}</span>
      </div>
      <div className="w-px h-6 bg-border-light" />
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-sm text-text-secondary">Draft:</span>
        <span className="font-semibold text-text-primary">{stats.draft}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-sm text-text-secondary">Sent:</span>
        <span className="font-semibold text-text-primary">{stats.sent}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-text-secondary">Paid:</span>
        <span className="font-semibold text-text-primary">{stats.paid}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm text-text-secondary">Overdue:</span>
        <span className="font-semibold text-text-primary">{stats.overdue}</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Total Value:</span>
        <span className="font-mono font-bold text-primary">{formatCurrency(stats.totalAmount)}</span>
      </div>
    </div>
  )
}

export default function Invoices() {
  const { state, dispatch, showToast } = useApp()
  const navigate = useNavigate()
  
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Fetch invoices from API
  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (debouncedSearch) params.append('search', debouncedSearch)
      
      const queryString = params.toString()
      const url = `/invoices/${queryString ? `?${queryString}` : ''}`
      console.log("the url is:", url)
      const response = await api.getInvoices()
      console.log("got the invoices:", response)
      setInvoices(response.results || [])
      dispatch({ type: 'SET_INVOICES', payload: response.data || [] })
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err.message || 'Failed to load invoices')
      showToast('Failed to load invoices', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchInvoices()
  }, [statusFilter, debouncedSearch])
  
  // Filter invoices client-side for search
  const filteredInvoices = useMemo(() => {
    if (!debouncedSearch && !statusFilter) return invoices
    
    return invoices.filter(invoice => {
      const invoiceNumber = (invoice.invoice_number || invoice.id || '').toLowerCase()
      const clientName = (invoice.client_name || invoice.client?.name || '').toLowerCase()
      const searchLower = debouncedSearch.toLowerCase()
      
      const matchesSearch = !debouncedSearch || 
        invoiceNumber.includes(searchLower) || 
        clientName.includes(searchLower)
      
      const matchesStatus = !statusFilter || invoice.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [invoices, debouncedSearch, statusFilter])
  
  const handleView = (invoice) => {
    navigate(`/invoices/${invoice.id}`)
  }

  const handleEdit = (invoice) => {
    navigate(`/invoices/${invoice.id}/edit`)
  }

  const handleSend = async (invoice) => {
    setActionLoading(invoice.id)
    try {
      await api.sendInvoice(invoice.id)
      showToast(`Invoice ${invoice.invoice_number || invoice.id} sent successfully!`, 'success')
      fetchInvoices() // Refresh list
    } catch (err) {
      console.error('Error sending invoice:', err)
      showToast(err.message || 'Failed to send invoice', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPaid = async (invoice) => {
    setActionLoading(invoice.id)
    try {
      await api.updateInvoiceStatus(invoice.id, 'paid')
      showToast(`Invoice ${invoice.invoice_number || invoice.id} marked as paid!`, 'success')
      fetchInvoices() // Refresh list
    } catch (err) {
      console.error('Error updating invoice:', err)
      showToast(err.message || 'Failed to update invoice status', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClone = async (invoice) => {
    setActionLoading(invoice.id)
    try {
      const clonedData = {
        client: invoice.client?.id || invoice.client,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: invoice.items?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          tax_rate: item.tax_rate
        })) || [],
        notes: invoice.notes,
        terms: invoice.terms
      }
      
      const response = await api.createInvoice(clonedData)
      showToast(`Invoice duplicated successfully!`, 'success')
      fetchInvoices() // Refresh list
      navigate(`/invoices/${response.data.id}/edit`)
    } catch (err) {
      console.error('Error cloning invoice:', err)
      showToast(err.message || 'Failed to duplicate invoice', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (invoice) => {
    const invoiceNum = invoice.invoice_number || invoice.id
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNum}? This action cannot be undone.`)) {
      return
    }
    
    setActionLoading(invoice.id)
    try {
      await api.deleteInvoice(invoice.id)
      showToast(`Invoice ${invoiceNum} deleted successfully.`, 'success')
      fetchInvoices() // Refresh list
    } catch (err) {
      console.error('Error deleting invoice:', err)
      showToast(err.message || 'Failed to delete invoice', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadPdf = async (invoice) => {
    setActionLoading(invoice.id)
    try {
      const blob = await api.downloadInvoicePdf(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('Invoice PDF downloaded successfully!', 'success')
    } catch (err) {
      console.error('Error downloading PDF:', err)
      showToast(err.message || 'Failed to download PDF', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await api.exportInvoices({ status: statusFilter, search: debouncedSearch })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('Invoices exported successfully!', 'success')
    } catch (err) {
      console.error('Error exporting invoices:', err)
      showToast(err.message || 'Failed to export invoices', 'error')
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
  }

  const hasFilters = searchQuery || statusFilter

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-1">Invoices</h1>
          <p className="text-text-secondary">Manage and track all your invoices</p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary">
          <Plus size={18} />
          New Invoice
        </Link>
      </div>

      {/* Stats Bar */}
      <StatsBar invoices={invoices} loading={loading} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by invoice number or client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-11 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <FilterDropdown 
          label="Status"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <button onClick={handleExport} className="btn btn-secondary">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card p-8 text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-primary mb-4" />
          <p className="text-text-secondary">Loading invoices...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card p-8 text-center">
          <AlertTriangle size={40} className="mx-auto text-danger mb-4" />
          <h3 className="font-semibold text-lg text-text-primary mb-2">Failed to load invoices</h3>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button onClick={fetchInvoices} className="btn btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Invoices Table */}
      {!loading && !error && filteredInvoices.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell text-left rounded-tl-lg">Invoice</th>
                  <th className="table-cell text-left">Client</th>
                  <th className="table-cell text-left">Items</th>
                  <th className="table-cell text-left">Issue Date</th>
                  <th className="table-cell text-left">Due Date</th>
                  <th className="table-cell text-left">Amount</th>
                  <th className="table-cell text-left">Status</th>
                  <th className="table-cell text-left rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <InvoiceRow 
                    key={invoice.id} 
                    invoice={invoice}
                    onView={handleView}
                    onEdit={handleEdit}
                    onSend={handleSend}
                    onMarkPaid={handleMarkPaid}
                    onClone={handleClone}
                    onDelete={handleDelete}
                    onDownloadPdf={handleDownloadPdf}
                    loading={actionLoading === invoice.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-light">
            <p className="text-sm text-text-secondary">
              Showing <span className="font-medium">{filteredInvoices.length}</span> of{' '}
              <span className="font-medium">{invoices.length}</span> invoices
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredInvoices.length === 0 && (
        <div className="card">
          <EmptyState hasFilters={hasFilters} />
        </div>
      )}
    </div>
  )
}
