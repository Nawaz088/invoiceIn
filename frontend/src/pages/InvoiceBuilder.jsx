import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../services/api'
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Send,
  Plus,
  Trash2,
  Users,
  FileText,
  Download,
  Search,
  X,
  ChevronDown,
  AlertCircle,
  Info,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const hsnCodes = [
  { code: '9983', description: 'Architectural and engineering services' },
  { code: '9984', description: 'Information technology services' },
  { code: '9985', description: 'Support services' },
  { code: '9986', description: 'Manufacturing services' },
  { code: '9991', description: 'Financial and related services' },
  { code: '9992', description: 'Renting services' },
]

function ClientSelector({ clients, selectedClient, onSelect, loading }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(search.toLowerCase())
  )
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !loading && setOpen(!open)}
        className="w-full input text-left flex items-center justify-between"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-text-muted" />
            <span className="text-text-muted">Loading clients...</span>
          </div>
        ) : selectedClient ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-xs text-text-muted">
                {selectedClient.gstin || 'No GSTIN'} • {selectedClient.state || 'Unknown'}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-text-muted">Select a client...</span>
        )}
        <ChevronDown size={18} className={clsx("text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      
      {open && !loading && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-light rounded-lg shadow-lg z-30 animate-scale-in">
            <div className="p-3 border-b border-border-light">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-secondary rounded-md text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onSelect(client)
                      setOpen(false)
                      setSearch('')
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors"
                  >
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {client.gstin || 'No GSTIN'} • {client.state}
                      {client.tds_applicable && (
                        <span className="ml-2 text-amber-600">TDS Applicable</span>
                      )}
                    </p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-text-muted text-sm">
                  {search ? 'No clients match your search' : 'No clients found'}
                </p>
              )}
            </div>
            <div className="p-3 border-t border-border-light">
              <Link 
                to="/clients/new"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 text-sm text-accent hover:underline"
              >
                <Plus size={14} />
                Add New Client
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LineItemRow({ item, index, onUpdate, onRemove, canRemove }) {
  const [showHSNSuggestions, setShowHSNSuggestions] = useState(false)
  
  const filteredHSN = item.hsn_sac 
    ? hsnCodes.filter(h => h.code.includes(item.hsn_sac) || h.description.toLowerCase().includes(item.hsn_sac.toLowerCase()))
    : hsnCodes
  
  const subtotal = item.rate * item.quantity * (1 - (item.discount || 0) / 100)
  const taxAmount = subtotal * ((item.tax_rate || 18) / 100)
  const lineTotal = subtotal + taxAmount
  
  return (
    <tr className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      <td className="p-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          placeholder="Service description"
          className="input py-2 text-sm"
        />
      </td>
      <td className="p-2 w-28">
        <div className="relative">
          <input
            type="text"
            value={item.hsn_sac}
            onChange={(e) => onUpdate(index, 'hsn_sac', e.target.value)}
            onFocus={() => setShowHSNSuggestions(true)}
            onBlur={() => setTimeout(() => setShowHSNSuggestions(false), 200)}
            placeholder="HSN/SAC"
            className="input py-2 text-sm font-mono"
          />
          {showHSNSuggestions && filteredHSN.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-light rounded-lg shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
              {filteredHSN.slice(0, 5).map(hsn => (
                <button
                  key={hsn.code}
                  type="button"
                  onMouseDown={() => {
                    onUpdate(index, 'hsn_sac', hsn.code)
                    if (!item.description) {
                      onUpdate(index, 'description', hsn.description)
                    }
                    setShowHSNSuggestions(false)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-secondary transition-colors"
                >
                  <p className="font-mono text-xs text-primary">{hsn.code}</p>
                  <p className="text-xs text-text-muted truncate">{hsn.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="p-2 w-24">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
          min="0.01"
          step="0.01"
          className="input py-2 text-sm text-right font-mono"
        />
      </td>
      <td className="p-2 w-32">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₹</span>
          <input
            type="number"
            value={item.rate}
            onChange={(e) => onUpdate(index, 'rate', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="input py-2 pl-7 text-sm text-right font-mono"
          />
        </div>
      </td>
      <td className="p-2 w-24">
        <div className="relative">
          <input
            type="number"
            value={item.discount || 0}
            onChange={(e) => onUpdate(index, 'discount', parseFloat(e.target.value) || 0)}
            min="0"
            max="100"
            className="input py-2 text-sm text-right font-mono pr-6"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">%</span>
        </div>
      </td>
      <td className="p-2 w-28">
        <select
          value={item.tax_rate || 18}
          onChange={(e) => onUpdate(index, 'tax_rate', parseFloat(e.target.value))}
          className="input py-2 text-sm font-mono"
        >
          <option value="0">0%</option>
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18">18%</option>
          <option value="28">28%</option>
        </select>
      </td>
      <td className="p-2 w-32 text-right">
        <span className="font-mono font-semibold text-sm">
          {formatCurrency(lineTotal)}
        </span>
      </td>
      <td className="p-2 w-12">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="btn-icon text-text-muted hover:text-danger"
          disabled={!canRemove}
          title={canRemove ? 'Remove item' : 'Cannot remove last item'}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  )
}

function InvoicePreview({ invoice, client, business, isInterState }) {
  const subtotal = invoice.items.reduce((sum, item) => 
    sum + (item.rate * item.quantity * (1 - (item.discount || 0) / 100)), 0
  )
  const discountAmount = invoice.items.reduce((sum, item) => 
    sum + (item.rate * item.quantity * (item.discount || 0) / 100), 0
  )
  
  const taxableAmount = subtotal - discountAmount
  
  // Calculate tax per item based on their individual tax rates
  const taxDetails = invoice.items.reduce((acc, item) => {
    const itemSubtotal = item.rate * item.quantity * (1 - (item.discount || 0) / 100)
    const itemTaxRate = item.tax_rate || 18
    
    if (isInterState) {
      acc.igst += itemSubtotal * (itemTaxRate / 100)
    } else {
      acc.cgst += itemSubtotal * (itemTaxRate / 200)
      acc.sgst += itemSubtotal * (itemTaxRate / 200)
    }
    return acc
  }, { cgst: 0, sgst: 0, igst: 0 })
  
  const totalTax = taxDetails.cgst + taxDetails.sgst + taxDetails.igst
  const total = taxableAmount + totalTax
  
  return (
    <div className="bg-white rounded-lg invoice-shadow overflow-hidden" style={{ aspectRatio: '1/1.414' }}>
      <div className="p-8 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="font-display text-2xl text-primary mb-1">
              {business?.business_name || business?.businessName || 'Your Business Name'}
            </h2>
            <p className="text-sm text-text-secondary">
              {business?.business_type || business?.businessType || 'Business'} • GSTIN: {business?.gstin || 'XXXXXXXXXXXXX'}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {business?.address || business?.state || 'Address'}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-3xl text-accent mb-2">INVOICE</h1>
            <p className="font-mono text-sm font-semibold">{invoice.invoice_number || invoice.invoiceNumber || 'INV-XXXX-XXX'}</p>
          </div>
        </div>
        
        {/* Client & Date Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Bill To</p>
            {client ? (
              <>
                <p className="font-semibold text-text-primary">{client.name}</p>
                <p className="text-sm text-text-secondary">{client.gstin || 'Unregistered'}</p>
                <p className="text-sm text-text-secondary">{client.address || client.state}</p>
              </>
            ) : (
              <p className="text-text-muted italic">Select a client</p>
            )}
          </div>
          <div className="text-right">
            <div className="mb-2">
              <p className="text-xs text-text-muted uppercase tracking-wide">Issue Date</p>
              <p className="font-mono text-sm">{invoice.issue_date || invoice.issueDate || 'Select date'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Due Date</p>
              <p className="font-mono text-sm">{invoice.due_date || invoice.dueDate || 'Select date'}</p>
            </div>
          </div>
        </div>
        
        {/* Line Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-primary/20">
              <th className="text-left text-xs text-text-muted uppercase tracking-wide py-2">Description</th>
              <th className="text-right text-xs text-text-muted uppercase tracking-wide py-2 w-20">Qty</th>
              <th className="text-right text-xs text-text-muted uppercase tracking-wide py-2 w-28">Rate</th>
              <th className="text-right text-xs text-text-muted uppercase tracking-wide py-2 w-20">Disc%</th>
              <th className="text-right text-xs text-text-muted uppercase tracking-wide py-2 w-24">Tax%</th>
              <th className="text-right text-xs text-text-muted uppercase tracking-wide py-2 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const itemSubtotal = item.rate * item.quantity * (1 - (item.discount || 0) / 100)
              const itemTax = itemSubtotal * ((item.tax_rate || 18) / 100)
              const itemTotal = itemSubtotal + itemTax
              return (
                <tr key={idx} className="border-b border-border-light">
                  <td className="py-2 text-sm">
                    <p className="font-medium">{item.description || 'Service'}</p>
                    <p className="text-xs text-text-muted font-mono">{item.hsn_sac || 'HSN/SAC'}</p>
                  </td>
                  <td className="py-2 text-sm text-right font-mono">{item.quantity}</td>
                  <td className="py-2 text-sm text-right font-mono">{formatCurrency(item.rate)}</td>
                  <td className="py-2 text-sm text-right font-mono">{item.discount || 0}%</td>
                  <td className="py-2 text-sm text-right font-mono">{item.tax_rate || 18}%</td>
                  <td className="py-2 text-sm text-right font-mono font-semibold">
                    {formatCurrency(itemTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-border-light">
              <span className="text-sm text-text-secondary">Subtotal</span>
              <span className="font-mono text-sm">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">Discount</span>
                <span className="font-mono text-sm text-green-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {taxDetails.cgst > 0 && (
              <div className="flex justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">CGST</span>
                <span className="font-mono text-sm">{formatCurrency(taxDetails.cgst)}</span>
              </div>
            )}
            {taxDetails.sgst > 0 && (
              <div className="flex justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">SGST</span>
                <span className="font-mono text-sm">{formatCurrency(taxDetails.sgst)}</span>
              </div>
            )}
            {taxDetails.igst > 0 && (
              <div className="flex justify-between py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">IGST</span>
                <span className="font-mono text-sm">{formatCurrency(taxDetails.igst)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 bg-primary/5 rounded-lg px-3 mt-2">
              <span className="font-semibold text-primary">Total</span>
              <span className="font-mono font-bold text-lg text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t border-border-light pt-4">
            {invoice.notes && (
              <div className="mb-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-text-secondary">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Terms & Conditions</p>
                <p className="text-sm text-text-secondary">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-border-light text-center">
          <p className="text-xs text-text-muted">
            Generated with InvoiceIN • {business?.business_name || business?.businessName || 'Your Business'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InvoiceBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch, showToast } = useApp()
  
  const isEditing = Boolean(id)
  const isViewing = window.location.pathname.includes('/invoices/') && window.location.pathname !== '/invoices/new' && !window.location.pathname.includes('/edit')
  
  const [loading, setLoading] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    client: null,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: 'Payment due within 30 days. Please include invoice number in your payment reference.',
    items: [
      { description: '', hsn_sac: '', quantity: 1, rate: 0, discount: 0, tax_rate: 18 }
    ]
  })
  
  const [errors, setErrors] = useState({})
  
  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true)
      try {
        // api.getClients() returns parsed JSON directly, not a response object
        const data = await api.getClients()
        setClients(data.results || data || [])
      } catch (err) {
        console.error('Error fetching clients:', err)
        showToast('Failed to load clients', 'error')
      } finally {
        setClientsLoading(false)
      }
    }
    fetchClients()
  }, [])
  
  // Fetch existing invoice if editing
  useEffect(() => {
    if (isEditing && id) {
      const fetchInvoice = async () => {
        setLoading(true)
        try {
          const data = await api.getInvoice(id)

          // Transform API data to form format
          setInvoice({
            id: data.id,
            invoice_number: data.invoice_number,
            client: data.client,
            issue_date: data.issue_date,
            due_date: data.due_date,
            notes: data.notes || '',
            terms: data.terms || 'Payment due within 30 days.',
            items: data.items || [
              { description: '', hsn_sac: '', quantity: 1, rate: 0, discount: 0, tax_rate: 18 }
            ]
          })
        } catch (err) {
          console.error('Error fetching invoice:', err)
          showToast('Failed to load invoice', 'error')
          navigate('/invoices')
        } finally {
          setLoading(false)
        }
      }
      fetchInvoice()
    }
  }, [isEditing, id])
  
  // Generate invoice number on mount
  useEffect(() => {
    if (!isEditing && !invoice.invoice_number) {
      const generateInvoiceNumber = async () => {
        try {
          const data = await api.getNextInvoiceNumber()
          console.log('Generated invoice number:', data)
          setInvoice(prev => ({ ...prev, invoice_number: data.invoice_number }))
        } catch (err) {
          console.error('Error generating invoice number:', err)
          // Fallback to generated number
          const nextNum = Math.floor(Math.random() * 900) + 100
          setInvoice(prev => ({
            ...prev,
            invoice_number: `INV-${new Date().getFullYear()}-${nextNum}`
          }))
        }
      }
      generateInvoiceNumber()
    }
  }, [isEditing])
  
  const selectedClient = useCallback(() => {
    if (!invoice.client) return null
    if (typeof invoice.client === 'object') return invoice.client
    return clients.find(c => c.id === invoice.client) || null
  }, [invoice.client, clients])
  
  const isInterState = selectedClient()?.state !== state.user?.state
  
  const handleClientSelect = (client) => {
    setInvoice({ ...invoice, client: client.id })
    setErrors(prev => ({ ...prev, client: null }))
  }
  
  const handleLineItemUpdate = (index, field, value) => {
    const newItems = [...invoice.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setInvoice({ ...invoice, items: newItems })
  }
  
  const handleAddLineItem = () => {
    setInvoice({
      ...invoice,
      items: [
        ...invoice.items,
        { description: '', hsn_sac: '', quantity: 1, rate: 0, discount: 0, tax_rate: 18 }
      ]
    })
  }
  
  const handleRemoveLineItem = (index) => {
    if (invoice.items.length > 1) {
      const newItems = invoice.items.filter((_, i) => i !== index)
      setInvoice({ ...invoice, items: newItems })
    }
  }
  
  const validateForm = () => {
    const newErrors = {}
    
    if (!invoice.client) {
      newErrors.client = 'Please select a client'
    }
    
    if (!invoice.invoice_number) {
      newErrors.invoice_number = 'Invoice number is required'
    }
    
    if (!invoice.issue_date) {
      newErrors.issue_date = 'Issue date is required'
    }
    
    if (!invoice.due_date) {
      newErrors.due_date = 'Due date is required'
    }
    
    const validItems = invoice.items.filter(item => 
      item.description && item.quantity > 0 && item.rate > 0
    )
    
    if (validItems.length === 0) {
      newErrors.items = 'At least one line item with description, quantity, and rate is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSave = async (sendInvoice = false) => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error')
      return
    }

    setSaving(true)

    try {
      // Prepare invoice data
      const invoiceData = {
        invoice_number: invoice.invoice_number,
        client: invoice.client,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes,
        terms: invoice.terms,
        line_items: invoice.items.filter(item =>
          item.description && (item.quantity > 0 || item.rate > 0)
        ).map(item => ({
          description: item.description,
          hsn_sac: item.hsn_sac || '',
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 18
        }))
      }

      let savedInvoice
      if (isEditing) {
        const data = await api.updateInvoice(id, invoiceData)
        savedInvoice = data
        showToast('Invoice updated successfully!', 'success')
      } else {
        const data = await api.createInvoice(invoiceData)
        savedInvoice = data
        showToast('Invoice created successfully!', 'success')
      }

      if (sendInvoice && savedInvoice) {
        try {
          await api.sendInvoice(savedInvoice.id)
          showToast('Invoice sent to client!', 'success')
        } catch (sendErr) {
          console.error('Error sending invoice:', sendErr)
          showToast('Invoice saved but failed to send', 'warning')
        }
      }

      navigate('/invoices')
    } catch (err) {
      console.error('Error saving invoice:', err)
      const errorMessage = err.data?.error || err.message || 'Failed to save invoice'
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }
  
  const handleSaveDraft = () => {
    handleSave(false)
  }
  
  const handleCreateAndSend = () => {
    handleSave(true)
  }
  
  const handleDownloadPdf = async () => {
    if (!invoice.id && !isEditing) {
      showToast('Please save the invoice first', 'warning')
      return
    }
    
    try {
      const invoiceId = invoice.id || id
      const blob = await api.downloadInvoicePdf(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number || id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('PDF downloaded successfully!', 'success')
    } catch (err) {
      console.error('Error downloading PDF:', err)
      showToast('Failed to download PDF', 'error')
    }
  }
  
  const handlePreview = () => {
    setPreviewOpen(true)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto text-primary mb-4" />
          <p className="text-text-secondary">Loading invoice...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="btn-icon text-text-secondary hover:bg-secondary">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-text-primary">
              {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
            <p className="text-sm text-text-secondary">
              {isEditing ? `Editing ${invoice.invoice_number}` : 'Fill in the details to create your invoice'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePreview}
            className="btn btn-secondary"
            type="button"
          >
            <Eye size={18} />
            Preview
          </button>
          <button 
            onClick={handleSaveDraft}
            className="btn btn-secondary"
            disabled={saving}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Draft
          </button>
          <button 
            onClick={handleCreateAndSend}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Create & Send
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Invoice Form */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <div className="card">
            <h2 className="font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
              <FileText size={20} />
              Invoice Details
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Invoice Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoice.invoice_number}
                    onChange={(e) => {
                      setInvoice({ ...invoice, invoice_number: e.target.value })
                      setErrors(prev => ({ ...prev, invoice_number: null }))
                    }}
                    className={clsx("input font-mono flex-1", errors.invoice_number && "border-danger")}
                    placeholder="INV-2024-001"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const data = await api.getNextInvoiceNumber()
                        setInvoice({ ...invoice, invoice_number: data.invoice_number })
                      } catch (err) {
                        showToast('Failed to generate invoice number', 'error')
                      }
                    }}
                    className="btn btn-secondary px-3"
                    title="Generate new number"
                    type="button"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                {errors.invoice_number && (
                  <p className="text-xs text-danger mt-1">{errors.invoice_number}</p>
                )}
              </div>
              
              <div>
                <label className="label">Issue Date</label>
                <input
                  type="date"
                  value={invoice.issue_date}
                  onChange={(e) => {
                    setInvoice({ ...invoice, issue_date: e.target.value })
                    setErrors(prev => ({ ...prev, issue_date: null }))
                  }}
                  className={clsx("input", errors.issue_date && "border-danger")}
                />
                {errors.issue_date && (
                  <p className="text-xs text-danger mt-1">{errors.issue_date}</p>
                )}
              </div>
              
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={invoice.due_date}
                  onChange={(e) => {
                    setInvoice({ ...invoice, due_date: e.target.value })
                    setErrors(prev => ({ ...prev, due_date: null }))
                  }}
                  className={clsx("input", errors.due_date && "border-danger")}
                />
                {errors.due_date && (
                  <p className="text-xs text-danger mt-1">{errors.due_date}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Client Selection */}
          <div className="card">
            <h2 className="font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
              <Users size={20} />
              Client Details
            </h2>
            
            <ClientSelector
              clients={clients}
              selectedClient={selectedClient()}
              onSelect={handleClientSelect}
              loading={clientsLoading}
            />
            
            {errors.client && (
              <p className="text-xs text-danger mt-2">{errors.client}</p>
            )}
            
            {selectedClient() && (
              <div className="mt-4 p-4 bg-secondary rounded-lg animate-slide-up">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{selectedClient().name}</p>
                    <p className="text-sm text-text-secondary mt-1">
                      GSTIN: {selectedClient().gstin || <span className="text-amber-600 font-medium">Not registered</span>}
                    </p>
                    <p className="text-sm text-text-secondary">
                      State: {selectedClient().state}
                    </p>
                    {selectedClient().tds_applicable && (
                      <div className="flex items-center gap-2 mt-2 text-amber-600">
                        <AlertCircle size={14} />
                        <span className="text-sm font-medium">TDS may apply on payments</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setInvoice({ ...invoice, client: null })}
                    className="text-text-muted hover:text-danger"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {isInterState && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <Info size={16} className="text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Inter-state supply: IGST will be applied instead of CGST+SGST
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Line Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                <FileText size={20} />
                Line Items
              </h2>
              <button 
                onClick={handleAddLineItem}
                className="btn btn-secondary text-sm"
                type="button"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>
            
            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm text-red-700">{errors.items}</p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="text-xs text-text-muted uppercase tracking-wide">
                    <th className="text-left pb-2 pl-2">Description</th>
                    <th className="text-left pb-2 w-28">HSN/SAC</th>
                    <th className="text-right pb-2 w-24">Qty</th>
                    <th className="text-right pb-2 w-32">Rate (₹)</th>
                    <th className="text-right pb-2 w-24">Disc %</th>
                    <th className="text-right pb-2 w-28">Tax %</th>
                    <th className="text-right pb-2 w-32">Amount</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <LineItemRow
                      key={index}
                      item={item}
                      index={index}
                      onUpdate={handleLineItemUpdate}
                      onRemove={handleRemoveLineItem}
                      canRemove={invoice.items.length > 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Notes & Terms */}
          <div className="card">
            <h2 className="font-semibold text-lg text-text-primary mb-4">Notes & Terms</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={invoice.notes}
                  onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                  placeholder="Add any additional notes for your client..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div>
                <label className="label">Terms & Conditions</label>
                <textarea
                  value={invoice.terms}
                  onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })}
                  rows={3}
                  className="input resize-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Live Preview */}
        <div className="hidden xl:block">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-text-primary">Live Preview</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadPdf}
                  className="btn btn-ghost text-sm"
                  type="button"
                  disabled={saving}
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
            <InvoicePreview 
              invoice={invoice}
              client={selectedClient()}
              business={state.user}
              isInterState={isInterState}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border-light flex items-center justify-between">
              <h3 className="font-semibold">Invoice Preview</h3>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="btn-icon"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <InvoicePreview 
                invoice={invoice}
                client={selectedClient()}
                business={state.user}
                isInterState={isInterState}
              />
            </div>
            <div className="p-4 border-t border-border-light flex justify-end gap-3">
              <button 
                onClick={handleDownloadPdf}
                className="btn btn-secondary"
                type="button"
              >
                <Download size={16} />
                Download PDF
              </button>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="btn btn-primary"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Preview Button */}
      <div className="xl:hidden fixed bottom-6 right-6">
        <button 
          onClick={handlePreview}
          className="btn btn-primary rounded-full w-14 h-14 shadow-lg"
          type="button"
        >
          <Eye size={24} />
        </button>
      </div>
    </div>
  )
}
