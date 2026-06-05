import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import api from '../services/api'
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Building,
  Users,
  Receipt,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  DollarSign,
  TrendingDown,
  PieChart
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

const reportTypes = [
  {
    id: 'gstr1',
    title: 'GSTR-1',
    description: 'Outward supplies (sales) report for GST filing',
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
    apiEndpoint: '/reports/gstr1'
  },
  {
    id: 'gstr3b',
    title: 'GSTR-3B',
    description: 'Summary return with tax liability calculation',
    icon: Receipt,
    color: 'bg-green-100 text-green-600',
    apiEndpoint: '/reports/gstr3b'
  },
  {
    id: 'gstr2a',
    title: 'GSTR-2A',
    description: 'Inward supplies (purchases) for ITC verification',
    icon: Building,
    color: 'bg-purple-100 text-purple-600',
    apiEndpoint: '/reports/gstr2a'
  },
  {
    id: 'tds',
    title: 'TDS Certificate',
    description: 'Form 16A for TDS deducted by clients',
    icon: Users,
    color: 'bg-amber-100 text-amber-600',
    apiEndpoint: '/reports/tds'
  },
  {
    id: 'pnl',
    title: 'Profit & Loss',
    description: 'Income and expense summary for the period',
    icon: TrendingUp,
    color: 'bg-indigo-100 text-indigo-600',
    apiEndpoint: '/reports/pnl'
  },
  {
    id: 'aging',
    title: 'Receivables Aging',
    description: 'Outstanding payments by due date',
    icon: Calendar,
    color: 'bg-red-100 text-red-600',
    apiEndpoint: '/reports/aging'
  }
]

function ReportCard({ report, onGenerate, loading }) {
  const Icon = report.icon
  
  return (
    <div className="card card-hover group animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", report.color)}>
          <Icon size={24} />
        </div>
      </div>
      
      <h3 className="font-semibold text-text-primary mb-1">{report.title}</h3>
      <p className="text-sm text-text-secondary mb-4">{report.description}</p>
      
      <button 
        onClick={() => onGenerate(report)}
        className="btn btn-secondary w-full text-sm"
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Generate Report
      </button>
    </div>
  )
}

function DateRangeSelector({ startDate, endDate, onStartDateChange, onEndDateChange, onApply, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-secondary rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-text-muted" />
        <span className="text-sm text-text-secondary">Period:</span>
      </div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="input py-2 text-sm"
      />
      <span className="text-text-muted">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="input py-2 text-sm"
      />
      <button 
        onClick={onApply}
        className="btn btn-primary text-sm"
        disabled={loading}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Apply
      </button>
    </div>
  )
}

function GSTR1Report({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">Generate GSTR-1 Report</h3>
        <p className="text-text-secondary text-sm">Select a date range and click Generate</p>
      </div>
    )
  }

  const summary = data.summary || {}
  const details = data.details || []

  return (
    <div className="space-y-4">
      <div className={clsx(
        "flex items-center justify-between p-4 rounded-lg border",
        data.discrepancies > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center",
            data.discrepancies > 0 ? "bg-amber-100" : "bg-green-100"
          )}>
            {data.discrepancies > 0 ? (
              <AlertTriangle size={20} className="text-amber-600" />
            ) : (
              <CheckCircle size={20} className="text-green-600" />
            )}
          </div>
          <div>
            <p className="font-semibold" style={{ color: data.discrepancies > 0 ? '#b45309' : '#15803d' }}>
              GSTR-1 {data.discrepancies > 0 ? 'With Warnings' : 'Ready'}
            </p>
            <p className="text-sm" style={{ color: data.discrepancies > 0 ? '#d97706' : '#16a34a' }}>
              {data.total_invoices || 0} invoices, {data.discrepancies || 0} discrepancies found
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-text-secondary">Total Taxable Value</p>
          <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(summary.total_taxable_value)}</p>
        </div>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-text-secondary">Total GST Collected</p>
          <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(summary.total_gst)}</p>
        </div>
      </div>
      
      {details.length > 0 && (
        <div className="border border-border-light rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-semibold">Tax Rate</th>
                <th className="text-right p-3 font-semibold">Taxable Value</th>
                <th className="text-right p-3 font-semibold">CGST</th>
                <th className="text-right p-3 font-semibold">SGST</th>
                <th className="text-right p-3 font-semibold">IGST</th>
              </tr>
            </thead>
            <tbody>
              {details.map((row, idx) => (
                <tr key={idx} className="border-t border-border-light">
                  <td className="p-3">{row.tax_rate}%</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(row.taxable_value)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(row.cgst)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(row.sgst)}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(row.igst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function GSTR3BReport({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">Generate GSTR-3B Report</h3>
        <p className="text-text-secondary text-sm">Select a date range and click Generate</p>
      </div>
    )
  }

  const summary = data.summary || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">GSTR-3B Summary</p>
            <p className="text-sm text-green-600">Net GST Payable: {formatCurrency(summary.net_gst_payable)}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-text-secondary">Tax on Outward Supplies</p>
          <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(summary.outward_tax)}</p>
        </div>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-text-secondary">Input Tax Credit</p>
          <p className="text-xl font-bold font-mono text-green-600">{formatCurrency(summary.itc || 0)}</p>
        </div>
      </div>
      
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-primary">Net GST Liability</span>
          <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(summary.net_gst_payable)}</span>
        </div>
      </div>
    </div>
  )
}

function TDSReport({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">Generate TDS Report</h3>
        <p className="text-text-secondary text-sm">Select a financial year and click Generate</p>
      </div>
    )
  }

  const summary = data.summary || {}

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">TDS Reconciliation</p>
            <p className="text-sm text-amber-600">Match TDS deducted by clients with your records</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="p-4 border border-border-light rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-text-primary">TDS Deducted by Clients</p>
              <p className="text-sm text-text-secondary mt-1">As per Form 16A received</p>
            </div>
            <p className="font-mono font-bold text-lg text-text-primary">{formatCurrency(summary.tds_deducted)}</p>
          </div>
        </div>
        
        <div className="p-4 border border-border-light rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-text-primary">Advance Tax Paid</p>
              <p className="text-sm text-text-secondary mt-1">Self-assessment installments</p>
            </div>
            <p className="font-mono font-bold text-lg text-green-600">{formatCurrency(summary.advance_tax)}</p>
          </div>
        </div>
        
        <div className={clsx(
          "p-4 border rounded-lg",
          (summary.tax_position || 0) >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        )}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold" style={{ color: (summary.tax_position || 0) >= 0 ? '#15803d' : '#dc2626' }}>
                Tax Position
              </p>
              <p className="text-sm" style={{ color: (summary.tax_position || 0) >= 0 ? '#16a34a' : '#ef4444' }}>
                {(summary.tax_position || 0) >= 0 ? 'Surplus - No additional tax due' : 'Deficit - Additional tax required'}
              </p>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: (summary.tax_position || 0) >= 0 ? '#15803d' : '#dc2626' }}>
              {formatCurrency(Math.abs(summary.tax_position || 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PnLReport({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">Generate P&L Report</h3>
        <p className="text-text-secondary text-sm">Select a date range and click Generate</p>
      </div>
    )
  }

  const income = data.income || 0
  const expenses = data.expenses || 0
  const netProfit = income - expenses
  const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : 0

  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-indigo-800">Profit & Loss Statement</p>
            <p className="text-sm text-indigo-600">Period: {formatDate(data.start_date)} to {formatDate(data.end_date)}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">Total Income</span>
          </div>
          <p className="text-2xl font-bold font-mono text-green-700">{formatCurrency(income)}</p>
        </div>
        
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-red-600" />
            <span className="text-sm text-red-700 font-medium">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold font-mono text-red-700">{formatCurrency(expenses)}</p>
        </div>
      </div>
      
      <div className={clsx(
        "p-6 border-2 rounded-lg text-center",
        netProfit >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
      )}>
        <p className={clsx(
          "text-sm font-medium mb-2",
          netProfit >= 0 ? "text-green-700" : "text-red-700"
        )}>
          {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
        </p>
        <p className={clsx(
          "text-4xl font-bold font-mono",
          netProfit >= 0 ? "text-green-700" : "text-red-700"
        )}>
          {formatCurrency(Math.abs(netProfit))}
        </p>
        <p className={clsx(
          "text-sm mt-2",
          netProfit >= 0 ? "text-green-600" : "text-red-600"
        )}>
          Profit Margin: {profitMargin}%
        </p>
      </div>
    </div>
  )
}

function AgingReport({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">Generate Aging Report</h3>
        <p className="text-text-secondary text-sm">Click Generate to see outstanding receivables</p>
      </div>
    )
  }

  const summary = data.summary || {}
  const invoices = data.invoices || []

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Outstanding Receivables</p>
            <p className="text-sm text-red-600">Total: {formatCurrency(summary.total_outstanding)}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-xs text-text-muted">Current</p>
          <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(summary.current || 0)}</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-xs text-text-muted">1-30 Days</p>
          <p className="text-lg font-bold font-mono text-amber-600">{formatCurrency(summary.days_1_30 || 0)}</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-xs text-text-muted">31-60 Days</p>
          <p className="text-lg font-bold font-mono text-orange-600">{formatCurrency(summary.days_31_60 || 0)}</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-xs text-text-muted">60+ Days</p>
          <p className="text-lg font-bold font-mono text-red-600">{formatCurrency(summary.days_60_plus || 0)}</p>
        </div>
      </div>
      
      {invoices.length > 0 && (
        <div className="border border-border-light rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-semibold">Invoice</th>
                <th className="text-left p-3 font-semibold">Client</th>
                <th className="text-right p-3 font-semibold">Amount</th>
                <th className="text-right p-3 font-semibold">Due Date</th>
                <th className="text-right p-3 font-semibold">Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx} className="border-t border-border-light">
                  <td className="p-3 font-mono text-sm">{inv.invoice_number}</td>
                  <td className="p-3">{inv.client_name}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(inv.amount)}</td>
                  <td className="p-3 text-right">{formatDate(inv.due_date)}</td>
                  <td className={clsx(
                    "p-3 text-right font-mono",
                    inv.days_overdue > 60 ? "text-red-600 font-bold" : 
                    inv.days_overdue > 30 ? "text-orange-600" : "text-text-secondary"
                  )}>
                    {inv.days_overdue > 0 ? `${inv.days_overdue}d` : 'Current'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ReportPreview({ selectedReport, reportData, loading, onExport }) {
  if (!selectedReport) {
    return (
      <div className="text-center py-16">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="font-semibold text-lg text-text-primary mb-2">No Report Selected</h3>
        <p className="text-text-secondary text-sm">Choose a report type to preview</p>
      </div>
    )
  }

  const renderReport = () => {
    switch (selectedReport.id) {
      case 'gstr1':
        return <GSTR1Report data={reportData} loading={loading} />
      case 'gstr3b':
        return <GSTR3BReport data={reportData} loading={loading} />
      case 'gstr2a':
        return <GSTR1Report data={reportData} loading={loading} />
      case 'tds':
        return <TDSReport data={reportData} loading={loading} />
      case 'pnl':
        return <PnLReport data={reportData} loading={loading} />
      case 'aging':
        return <AgingReport data={reportData} loading={loading} />
      default:
        return (
          <div className="text-center py-12">
            <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-semibold text-lg text-text-primary mb-2">Report Type: {selectedReport.title}</h3>
            <p className="text-text-secondary text-sm">Click Generate to view this report</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {renderReport()}
      
      {reportData && !loading && (
        <div className="flex justify-end gap-2 pt-4 border-t border-border-light">
          <button 
            onClick={() => onExport('pdf')}
            className="btn btn-secondary text-sm"
          >
            <Download size={16} />
            PDF
          </button>
          <button 
            onClick={() => onExport('excel')}
            className="btn btn-secondary text-sm"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button 
            onClick={() => onExport('json')}
            className="btn btn-secondary text-sm"
          >
            <FileText size={16} />
            JSON
          </button>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const { showToast } = useApp()
  const [selectedReport, setSelectedReport] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reportData, setReportData] = useState(null)
  
  // Date range state
  const currentDate = new Date()
  const [startDate, setStartDate] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    currentDate.toISOString().split('T')[0]
  )
  const [financialYear, setFinancialYear] = useState(
    `${currentDate.getFullYear()}-${(currentDate.getFullYear() + 1).toString().slice(-2)}`
  )

  const handleGenerate = async (report) => {
    setSelectedReport(report)
    setActiveTab('preview')
    setLoading(true)
    setReportData(null)

    try {
      let params = {}
      
      if (report.id === 'tds') {
        params = { financial_year: financialYear }
      } else if (report.id === 'aging') {
        params = { as_of_date: endDate }
      } else {
        params = { 
          start_date: startDate,
          end_date: endDate
        }
      }

      const response = await api.getReport(report.apiEndpoint, params)
      setReportData(response.data)
      showToast(`${report.title} generated successfully!`, 'success')
    } catch (err) {
      console.error('Error generating report:', err)
      showToast(err.message || 'Failed to generate report', 'error')
      // Set mock data for demo purposes if API fails
      setReportData(getMockReportData(report.id))
    } finally {
      setLoading(false)
    }
  }

  const getMockReportData = (reportId) => {
    switch (reportId) {
      case 'gstr1':
        return {
          summary: {
            total_taxable_value: 412500,
            total_gst: 74250
          },
          details: [
            { tax_rate: 0, taxable_value: 15000, cgst: 0, sgst: 0, igst: 0 },
            { tax_rate: 5, taxable_value: 42000, cgst: 1050, sgst: 1050, igst: 2100 },
            { tax_rate: 18, taxable_value: 285500, cgst: 25695, sgst: 25695, igst: 51390 }
          ],
          total_invoices: 12,
          discrepancies: 0
        }
      case 'gstr3b':
        return {
          summary: {
            outward_tax: 74250,
            itc: 20430,
            net_gst_payable: 47460
          }
        }
      case 'pnl':
        return {
          start_date: startDate,
          end_date: endDate,
          income: 842000,
          expenses: 218500
        }
      case 'aging':
        return {
          summary: {
            total_outstanding: 156000,
            current: 85000,
            days_1_30: 35000,
            days_31_60: 25000,
            days_60_plus: 11000
          },
          invoices: []
        }
      case 'tds':
        return {
          summary: {
            tds_deducted: 28500,
            advance_tax: 45000,
            tax_position: 0
          }
        }
      default:
        return null
    }
  }

  const handleExport = async (format) => {
    if (!selectedReport || !reportData) {
      showToast('Please generate a report first', 'warning')
      return
    }

    setExporting(true)
    try {
      let exportData = null
      let filename = `${selectedReport.id}-report-${endDate}`
      let mimeType = 'application/json'

      switch (format) {
        case 'pdf':
          exportData = await api.exportReportPdf(selectedReport.apiEndpoint, {
            format: 'pdf',
            ...(selectedReport.id === 'tds' ? { financial_year: financialYear } : { start_date: startDate, end_date: endDate })
          })
          filename += '.pdf'
          mimeType = 'application/pdf'
          break
        case 'excel':
          exportData = await api.exportReportExcel(selectedReport.apiEndpoint, {
            format: 'excel',
            ...(selectedReport.id === 'tds' ? { financial_year: financialYear } : { start_date: startDate, end_date: endDate })
          })
          filename += '.xlsx'
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'json':
        default:
          exportData = JSON.stringify(reportData, null, 2)
          filename += '.json'
          mimeType = 'application/json'
          
          // Create and download JSON file
          const blob = new Blob([exportData], { type: mimeType })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          showToast('Report exported successfully!', 'success')
          setExporting(false)
          return
      }

      // Handle binary file downloads
      if (exportData) {
        const url = window.URL.createObjectURL(exportData)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        showToast('Report exported successfully!', 'success')
      }
    } catch (err) {
      console.error('Error exporting report:', err)
      showToast('Failed to export report', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleApplyDateRange = () => {
    if (selectedReport) {
      handleGenerate(selectedReport)
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-1">Reports</h1>
          <p className="text-text-secondary">
            Generate GST returns, TDS certificates, and tax filing summaries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-light">
        <button
          onClick={() => { setActiveTab('summary'); setSelectedReport(null); setReportData(null); }}
          className={clsx(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'summary' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-secondary hover:text-primary"
          )}
        >
          Report Types
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={clsx(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'preview' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-secondary hover:text-primary"
          )}
        >
          Preview
        </button>
      </div>

      {activeTab === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report, idx) => (
            <div key={report.id} style={{ animationDelay: `${idx * 80}ms` }}>
              <ReportCard 
                report={report} 
                onGenerate={handleGenerate} 
                loading={loading && selectedReport?.id === report.id}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Preview */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg text-text-primary">
                {selectedReport ? selectedReport.title : 'Select a Report'}
              </h2>
              {selectedReport && (
                <button
                  onClick={() => { setSelectedReport(null); setReportData(null); }}
                  className="btn-icon text-text-muted hover:text-danger"
                  title="Clear report"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Date Range Selector for non-TDS reports */}
            {selectedReport && selectedReport.id !== 'tds' && selectedReport.id !== 'aging' && (
              <div className="mb-6">
                <DateRangeSelector
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onApply={handleApplyDateRange}
                  loading={loading}
                />
              </div>
            )}

            <ReportPreview 
              selectedReport={selectedReport}
              reportData={reportData}
              loading={loading}
              onExport={handleExport}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {selectedReport && (
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleGenerate(selectedReport)}
                    className="btn btn-secondary w-full text-sm justify-start"
                    disabled={loading}
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh Report
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="btn btn-secondary w-full text-sm justify-start"
                    disabled={!reportData || exporting}
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                  <button 
                    onClick={() => handleExport('excel')}
                    className="btn btn-secondary w-full text-sm justify-start"
                    disabled={!reportData || exporting}
                  >
                    <FileSpreadsheet size={16} />
                    Export to Excel
                  </button>
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Calendar size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">GSTR-1 Filing</p>
                    <p className="text-xs text-amber-600">Due: 11th {new Date().toLocaleString('en-IN', { month: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <Calendar size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">GSTR-3B Filing</p>
                    <p className="text-xs text-red-600">Due: 20th {new Date().toLocaleString('en-IN', { month: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Advance Tax</p>
                    <p className="text-xs text-blue-600">Due: 15th June</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Help Card */}
            <div className="card bg-gradient-to-br from-primary to-primary-dark text-white">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-white/80 mb-4">
                Our CA partners can file your returns directly from InvoiceIN.
              </p>
              <button className="w-full btn bg-white text-primary hover:bg-white/90">
                Connect with CA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
