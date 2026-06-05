import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
  Receipt,
  Upload,
  Download,
  Filter,
  TrendingUp,
  Building,
  Wifi,
  Car,
  UtensilsCrossed,
  Package,
  Briefcase,
  CreditCard,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const CATEGORIES = [
  { value: 'software', label: 'Software & SaaS', icon: Wifi, color: 'bg-blue-100 text-blue-600' },
  { value: 'equipment', label: 'Equipment', icon: Package, color: 'bg-purple-100 text-purple-600' },
  { value: 'travel', label: 'Travel', icon: Car, color: 'bg-green-100 text-green-600' },
  { value: 'meals', label: 'Meals & Entertainment', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-600' },
  { value: 'office', label: 'Office Supplies', icon: Briefcase, color: 'bg-gray-100 text-gray-600' },
  { value: 'rent', label: 'Rent', icon: Building, color: 'bg-teal-100 text-teal-600' },
  { value: 'utilities', label: 'Utilities', icon: DollarSign, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'professional', label: 'Professional Services', icon: Briefcase, color: 'bg-indigo-100 text-indigo-600' },
  { value: 'marketing', label: 'Marketing', icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
  { value: 'other', label: 'Other', icon: CreditCard, color: 'bg-gray-100 text-gray-600' },
];

const PAYMENT_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

function CategoryBadge({ category }) {
  const cat = CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = cat.icon;

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cat.color)}>
      <Icon size={12} />
      {cat.label}
    </span>
  );
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr className="table-row group">
      <td className="table-cell">
        <p className="font-medium text-text-primary">{expense.vendor_name || expense.vendor}</p>
        <p className="text-xs text-text-muted mt-0.5">{expense.description}</p>
      </td>
      <td className="table-cell">
        <CategoryBadge category={expense.category} />
      </td>
      <td className="table-cell">
        <p className="font-mono">{formatCurrency(expense.amount)}</p>
        {expense.gst_amount > 0 && (
          <p className="text-xs text-text-muted">+{formatCurrency(expense.gst_amount)} GST</p>
        )}
      </td>
      <td className="table-cell">
        <p className="font-mono">{formatCurrency(expense.amount + (expense.gst_amount || 0))}</p>
      </td>
      <td className="table-cell text-text-secondary">
        {new Date(expense.invoice_date || expense.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="table-cell">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-border-light rounded-lg shadow-lg z-20 py-1 animate-scale-in">
                <button
                  onClick={() => {
                    onEdit(expense);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Edit size={14} /> Edit
                </button>
                <div className="border-t border-border-light my-1" />
                <button
                  onClick={() => {
                    onDelete(expense);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function ExpenseModal({ isOpen, onClose, onSave, expense }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    description: '',
    amount: '',
    gst_amount: '',
    category: 'software',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_mode: 'online',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        vendor_name: expense.vendor_name || expense.vendor || '',
        description: expense.description || '',
        amount: expense.amount || '',
        gst_amount: expense.gst_amount || '',
        category: expense.category || 'software',
        invoice_date: expense.invoice_date || expense.date || new Date().toISOString().split('T')[0],
        payment_mode: expense.payment_mode || 'online',
        reference_number: expense.reference_number || '',
        notes: expense.notes || '',
      });
    } else {
      setFormData({
        vendor_name: '',
        description: '',
        amount: '',
        gst_amount: '',
        category: 'software',
        invoice_date: new Date().toISOString().split('T')[0],
        payment_mode: 'online',
        reference_number: '',
        notes: '',
      });
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.amount) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        gst_amount: parseFloat(formData.gst_amount) || 0,
      };
      await onSave(submitData);
      onClose();
    } catch (error) {
      showToast('Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-text-primary">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="btn-icon text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Vendor/Party Name *</label>
            <input
              type="text"
              required
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              className="input"
              placeholder="Enter vendor name"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              placeholder="Brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (Rs) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input font-mono"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="label">GST Amount (Rs)</label>
              <input
                type="number"
                value={formData.gst_amount}
                onChange={(e) => setFormData({ ...formData, gst_amount: e.target.value })}
                className="input font-mono"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="input"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Reference/Invoice Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="input font-mono"
              placeholder="Invoice or bill number"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <RefreshCw size={18} className="animate-spin" /> : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function SummaryCard({ title, amount, subtitle, icon: Icon, color }) {
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-sm text-text-secondary mb-1">{title}</p>
      <p className="text-2xl font-bold font-mono text-text-primary">{formatCurrency(amount)}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
        <Receipt size={40} className="text-text-muted" />
      </div>
      <h3 className="font-display text-xl text-text-primary mb-2">No expenses recorded</h3>
      <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
        Track your business expenses to claim input tax credit and maintain accurate records.
      </p>
      <button onClick={onAdd} className="btn btn-primary">
        <Plus size={18} />
        Record First Expense
      </button>
    </div>
  );
}

export default function Expenses() {
  const { state, fetchExpenses, createExpense, updateExpense, deleteExpense, openModal, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = state.expenses.filter((expense) => {
    const vendorName = expense.vendor_name || expense.vendor || '';
    const matchesSearch =
      vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = state.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalGST = state.expenses.reduce((sum, e) => sum + (e.gst_amount || 0), 0);
  const itcEligibleCategories = ['software', 'equipment', 'professional', 'rent', 'utilities'];
  const itcAmount = state.expenses
    .filter((e) => itcEligibleCategories.includes(e.category))
    .reduce((sum, e) => sum + (e.gst_amount || 0), 0);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleSaveExpense = async (formData) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
      } else {
        await createExpense(formData);
      }
    } catch (error) {
      showToast('Failed to save expense', 'error');
    }
  };

  const handleDeleteExpense = (expense) => {
    openModal('deleteConfirm', { type: 'expense', item: expense });
  };

  const handleExport = () => {
    const csvContent = [
      ['Vendor', 'Description', 'Category', 'Amount', 'GST', 'Date'].join(','),
      ...state.expenses.map((e) =>
        [
          `"${e.vendor_name || e.vendor}"`,
          `"${e.description || ''}"`,
          e.category,
          e.amount,
          e.gst_amount || 0,
          e.invoice_date || e.date,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Expenses exported successfully', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-1">Expenses</h1>
          <p className="text-text-secondary">
            Track business expenses for input tax credit and tax filing
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button onClick={handleAddExpense} className="btn btn-primary">
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          title="Total Expenses"
          amount={totalExpenses}
          subtitle="This financial year"
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          title="GST Paid"
          amount={totalGST}
          subtitle="Total input tax"
          icon={Building}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          title="ITC Available"
          amount={itcAmount}
          subtitle="Can be claimed as credit"
          icon={Receipt}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-11"
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
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      {state.loading.expenses ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-accent" />
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell text-left rounded-tl-lg">Vendor / Description</th>
                  <th className="table-cell text-left">Category</th>
                  <th className="table-cell text-left">Amount</th>
                  <th className="table-cell text-left">Total</th>
                  <th className="table-cell text-left">Date</th>
                  <th className="table-cell text-left rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          {searchQuery || categoryFilter !== 'all' ? (
            <div className="text-center py-12">
              <Filter size={40} className="mx-auto mb-4 text-text-muted" />
              <h3 className="font-semibold text-lg text-text-primary mb-2">No matching expenses</h3>
              <p className="text-text-secondary text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <EmptyState onAdd={handleAddExpense} />
          )}
        </div>
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        expense={editingExpense}
      />
    </div>
  );
}
