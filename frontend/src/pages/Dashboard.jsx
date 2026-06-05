import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building,
  Eye,
  Trash2,
  Clock,
  Send,
  Users,
  Receipt,
  Download,
  Plus,
  RefreshCw,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

function MetricCard({ icon: Icon, label, amount, change, color, delay = 0, onClick }) {
  const isPositive = change >= 0;

  return (
    <button
      onClick={onClick}
      className="card card-hover group animate-stagger text-left w-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            color === 'blue' && 'bg-blue-100 text-blue-600',
            color === 'green' && 'bg-green-100 text-green-600',
            color === 'red' && 'bg-red-100 text-red-600',
            color === 'amber' && 'bg-amber-100 text-amber-600'
          )}
        >
          <Icon size={24} />
        </div>
        {change !== undefined && change !== null && (
          <div
            className={clsx(
              'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
              isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            )}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      <p className="text-text-secondary text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary font-mono">
        {formatCurrency(amount)}
      </p>
      <p className="text-xs text-text-muted mt-1">vs last month</p>
    </button>
  );
}

function QuickAction({ icon: Icon, label, description, color, onClick }) {
  return (
    <button onClick={onClick} className="card card-hover text-left w-full group">
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
            color === 'accent' && 'bg-accent/10 text-accent',
            color === 'primary' && 'bg-primary/10 text-primary',
            color === 'success' && 'bg-success/10 text-success'
          )}
        >
          <Icon size={24} />
        </div>
        <div>
          <p className="font-semibold text-text-primary mb-0.5">{label}</p>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
    </button>
  );
}

function InvoiceRow({ invoice, onView, onSend, onDelete, onMarkPaid, onDownload }) {
  const statusStyles = {
    draft: 'badge-draft',
    sent: 'badge-sent',
    paid: 'badge-paid',
    overdue: 'badge-overdue',
  };

  const statusLabels = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
  };

  return (
    <tr className="table-row group">
      <td className="table-cell font-mono text-sm text-primary font-medium">
        {invoice.invoice_number || invoice.id}
      </td>
      <td className="table-cell font-medium">{invoice.client_name || invoice.client?.name || '-'}</td>
      <td className="table-cell font-mono">{formatCurrency(invoice.total || invoice.amount)}</td>
      <td className="table-cell">
        <span className={clsx('badge', statusStyles[invoice.status])}>
          {statusLabels[invoice.status] || invoice.status}
        </span>
      </td>
      <td className="table-cell text-text-secondary">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          {invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })
            : '-'}
        </div>
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(invoice)}
            className="btn-icon text-text-muted hover:text-primary"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onDownload(invoice)}
            className="btn-icon text-text-muted hover:text-blue-600"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
          {invoice.status !== 'sent' && invoice.status !== 'paid' && (
            <button
              onClick={() => onSend(invoice)}
              className="btn-icon text-text-muted hover:text-blue-600"
              title="Send"
            >
              <Send size={16} />
            </button>
          )}
          {invoice.status !== 'paid' && (
            <button
              onClick={() => onMarkPaid(invoice)}
              className="btn-icon text-text-muted hover:text-green-600"
              title="Mark Paid"
            >
              <CheckCircle size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(invoice)}
            className="btn-icon text-text-muted hover:text-danger"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PaymentReminderCard({ reminders, onSendReminder, loading }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Payment Reminders</h3>
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          {reminders.length} Active
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={24} className="animate-spin text-accent" />
        </div>
      ) : reminders.length > 0 ? (
        <div className="space-y-3">
          {reminders.map((reminder, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    reminder.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  )}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="font-medium text-sm">{reminder.client}</p>
                  <p className="text-xs text-text-muted">
                    {reminder.status === 'overdue'
                      ? `${reminder.daysOverdue} days overdue`
                      : `Due in ${reminder.daysUntilDue} days`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono font-semibold text-sm">
                  {formatCurrency(reminder.amount)}
                </p>
                <button
                  onClick={() => onSendReminder(reminder)}
                  className="btn-icon text-accent hover:bg-accent/10"
                  title="Send Reminder"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
          <p className="text-sm text-text-secondary">All payments up to date!</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const {
    state,
    fetchDashboard,
    fetchInvoices,
    fetchClients,
    sendInvoice,
    markInvoicePaid,
    sendReminder,
    deleteInvoice,
    downloadInvoicePDF,
    openModal,
    showToast,
  } = useApp();
  const navigate = useNavigate();
  const { dashboard, invoices, loading } = state;

  const overdueInvoices = invoices.filter((i) => i.status === 'overdue' || i.status === 'sent');
  const reminders = overdueInvoices.slice(0, 5).map((inv) => ({
    ...inv,
    client: inv.client_name || inv.client?.name || 'Unknown Client',
    amount: inv.total || inv.amount,
    status: inv.status === 'overdue' ? 'overdue' : 'due',
    daysOverdue: inv.due_date
      ? Math.floor((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
      : 0,
  }));

  useEffect(() => {
    fetchDashboard();
    fetchInvoices();
    fetchClients();
  }, [fetchDashboard, fetchInvoices, fetchClients]);

  const handleViewInvoice = (invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleSendInvoice = async (invoice) => {
    await sendInvoice(invoice.id, 'email');
  };

  const handleMarkPaid = async (invoice) => {
    openModal('markPaid', invoice);
  };

  const handleDeleteInvoice = (invoice) => {
    openModal('deleteConfirm', { type: 'invoice', item: invoice });
  };

  const handleSendReminder = async (reminder) => {
    await sendReminder(reminder.id);
  };

  const handleDownloadPDF = async (invoice) => {
    await downloadInvoicePDF(invoice.id);
  };

  const handleRefresh = () => {
    fetchDashboard();
    fetchInvoices();
    showToast('Data refreshed', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-2">
            Welcome back, {state.user?.name?.split(' ')[0] || state.user?.business_name || 'User'}!
          </h1>
          <p className="text-text-secondary">Here's what's happening with your business.</p>
        </div>
        <button onClick={handleRefresh} className="btn btn-secondary" disabled={loading.invoices}>
          <RefreshCw size={18} className={loading.invoices ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* GST Threshold Banner */}
      {dashboard.gstLiability > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">GST Liability This Period</p>
            <p className="text-sm text-amber-700 mt-0.5">
              You have {formatCurrency(dashboard.gstLiability)} in GST to pay. File your returns on time.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-secondary border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            View Details
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={FileText}
          label="Invoiced This Month"
          amount={dashboard.invoicedThisMonth}
          change={dashboard.changeInvoiced}
          color="blue"
          delay={0}
          onClick={() => navigate('/invoices')}
        />
        <MetricCard
          icon={CheckCircle}
          label="Received This Month"
          amount={dashboard.receivedThisMonth}
          change={dashboard.changeReceived}
          color="green"
          delay={80}
          onClick={() => navigate('/invoices?status=paid')}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Outstanding Overdue"
          amount={dashboard.overdueAmount}
          change={dashboard.changeOverdue}
          color="red"
          delay={160}
          onClick={() => navigate('/invoices?status=overdue')}
        />
        <MetricCard
          icon={Building}
          label="GST Liability"
          amount={dashboard.gstLiability}
          change={dashboard.changeGst}
          color="amber"
          delay={240}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg text-text-primary">Recent Invoices</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/invoices/new')}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                New Invoice
              </button>
              <button
                onClick={() => navigate('/invoices')}
                className="text-sm text-accent hover:underline font-medium"
              >
                View All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading.invoices ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-accent" />
              </div>
            ) : invoices.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell text-left rounded-tl-lg">Invoice #</th>
                    <th className="table-cell text-left">Client</th>
                    <th className="table-cell text-left">Amount</th>
                    <th className="table-cell text-left">Status</th>
                    <th className="table-cell text-left">Due Date</th>
                    <th className="table-cell text-left rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      onView={handleViewInvoice}
                      onSend={handleSendInvoice}
                      onMarkPaid={handleMarkPaid}
                      onDelete={handleDeleteInvoice}
                      onDownload={handleDownloadPDF}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-text-muted mb-4" />
                <p className="text-text-secondary mb-4">No invoices yet</p>
                <button onClick={() => navigate('/invoices/new')} className="btn btn-primary">
                  <Plus size={18} />
                  Create Your First Invoice
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-lg text-text-primary mb-4">Quick Actions</h2>
            <div className="space-y-3 animate-stagger">
              <QuickAction
                icon={FileText}
                label="Create Invoice"
                description="Generate a new professional invoice"
                color="accent"
                onClick={() => navigate('/invoices/new')}
              />
              <QuickAction
                icon={Users}
                label="Add Client"
                description="Build your client database"
                color="primary"
                onClick={() => navigate('/clients')}
              />
              <QuickAction
                icon={Receipt}
                label="Record Expense"
                description="Track business expenses"
                color="success"
                onClick={() => navigate('/expenses')}
              />
            </div>
          </div>

          <PaymentReminderCard
            reminders={reminders}
            onSendReminder={handleSendReminder}
            loading={loading.invoices}
          />
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">GST Summary</h3>
            <span className="text-sm text-text-secondary">Current Period</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border-light">
              <div>
                <p className="text-sm text-text-secondary">CGST + SGST</p>
                <p className="font-mono font-semibold">{formatCurrency(dashboard.gstLiability / 2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary">IGST</p>
                <p className="font-mono font-semibold">{formatCurrency(0)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-border-light">
              <div>
                <p className="text-sm text-text-secondary">Total Tax Collected</p>
                <p className="font-mono font-semibold text-accent">{formatCurrency(dashboard.gstLiability)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-text-secondary">Net GST Payable</p>
              <p className="font-mono font-bold text-lg text-accent">{formatCurrency(dashboard.gstLiability)}</p>
            </div>
          </div>

          <button onClick={() => navigate('/reports')} className="btn btn-secondary w-full mt-4">
            View GSTR Reports
          </button>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Quick Stats</h3>
            <span className="text-sm text-text-secondary">This Month</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  <p className="text-sm text-blue-700">Total Invoiced</p>
                </div>
                <p className="font-mono font-bold text-blue-800">{formatCurrency(dashboard.invoicedThisMonth)}</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-green-600" />
                  <p className="text-sm text-green-700">Total Received</p>
                </div>
                <p className="font-mono font-bold text-green-800">{formatCurrency(dashboard.receivedThisMonth)}</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <p className="text-sm text-red-700">Outstanding</p>
                </div>
                <p className="font-mono font-bold text-red-800">{formatCurrency(dashboard.overdueAmount)}</p>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/reports')} className="btn btn-secondary w-full mt-4">
            View Full Reports
          </button>
        </div>
      </div>
    </div>
  );
}
