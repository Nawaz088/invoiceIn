import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle,
  FileText,
  Eye,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
];

const TDS_SECTIONS = [
  { value: '194J', label: '194J - Professional Fees' },
  { value: '194C', label: '194C - Contractor' },
  { value: '194H', label: '194H - Commission' },
  { value: '194I', label: '194I - Rent' },
  { value: '194A', label: '194A - Interest' },
  { value: '194', label: '194 - Dividends' },
];

function ClientModal({ isOpen, onClose, onSave, client, verifyGSTIN }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    tds_applicable: false,
    tds_percent: '10',
    tds_section: '194J',
    payment_terms: '30',
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        pincode: client.pincode || '',
        gstin: client.gstin || '',
        pan: client.pan || '',
        tds_applicable: client.tds_applicable || false,
        tds_percent: String(client.tds_percent || '10'),
        tds_section: client.tds_section || '194J',
        payment_terms: String(client.payment_terms || '30'),
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '', email: '', phone: '', address: '', city: '', state: '',
        pincode: '', gstin: '', pan: '', tds_applicable: false,
        tds_percent: '10', tds_section: '194J', payment_terms: '30', notes: '',
      });
    }
  }, [client]);

  const handleVerifyGSTIN = async () => {
    if (!formData.gstin || formData.gstin.length !== 15) {
      showToast('Please enter a valid 15-character GSTIN', 'error');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyGSTIN(formData.gstin);
      if (result) {
        showToast('GSTIN verified successfully!', 'success');
      }
    } catch {
      showToast('GSTIN verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.state) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        tds_applicable: formData.tds_applicable,
        tds_percent: parseFloat(formData.tds_percent),
        payment_terms: parseInt(formData.payment_terms),
      };
      await onSave(submitData);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-text-primary">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="btn-icon text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Business/Client Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Enter client or company name"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input pl-10"
                  placeholder="client@company.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input pl-10"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input"
                placeholder="City"
              />
            </div>

            <div>
              <label className="label">State *</label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input"
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="input"
                placeholder="400001"
                maxLength={6}
              />
            </div>

            <div>
              <label className="label">GSTIN</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="input font-mono flex-1"
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                />
                <button
                  type="button"
                  onClick={handleVerifyGSTIN}
                  disabled={verifying || !formData.gstin}
                  className="btn btn-secondary"
                >
                  {verifying ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                </button>
              </div>
              {formData.gstin && formData.gstin.length === 15 && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} /> Valid GSTIN format
                </p>
              )}
            </div>

            <div>
              <label className="label">PAN</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="input font-mono"
                placeholder="AAAPL1234C"
                maxLength={10}
              />
            </div>

            <div>
              <label className="label">Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="input"
                placeholder="30"
                min="0"
              />
            </div>

            <div className="sm:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.tds_applicable}
                  onChange={(e) => setFormData({ ...formData, tds_applicable: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">TDS Applicable</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Check this if the client is a company or deducts TDS on payments
                  </p>
                  {formData.tds_applicable && (
                    <div className="flex gap-4 mt-2">
                      <select
                        value={formData.tds_percent}
                        onChange={(e) => setFormData({ ...formData, tds_percent: e.target.value })}
                        className="input py-2 text-sm flex-1"
                      >
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="5">5%</option>
                        <option value="2">2%</option>
                        <option value="1">1%</option>
                      </select>
                      <select
                        value={formData.tds_section}
                        onChange={(e) => setFormData({ ...formData, tds_section: e.target.value })}
                        className="input py-2 text-sm flex-1"
                      >
                        {TDS_SECTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : client ? (
                'Update Client'
              ) : (
                'Add Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ClientCard({ client, onEdit, onDelete, onViewInvoices, onCreateInvoice }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="card card-hover group animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            <Building size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{client.name}</h3>
            <p className="text-sm text-text-muted">{client.state}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border-light rounded-lg shadow-lg z-20 py-1 animate-scale-in">
                <button
                  onClick={() => { onViewInvoices(client); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Eye size={14} /> View Invoices
                </button>
                <button
                  onClick={() => { onCreateInvoice(client); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <FileText size={14} /> Create Invoice
                </button>
                <button
                  onClick={() => { onEdit(client); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Edit size={14} /> Edit
                </button>
                <div className="border-t border-border-light my-1" />
                <button
                  onClick={() => { onDelete(client); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {client.email && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Mail size={14} />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Phone size={14} />
            <span>{client.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-text-secondary">
          <MapPin size={14} />
          <span>{client.city ? `${client.city}, ` : ''}{client.state}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-light">
        <div>
          <p className="text-xs text-text-muted">Total Invoiced</p>
          <p className="font-mono font-semibold text-primary">
            {formatCurrency(client.total_invoiced || client.totalInvoiced || 0)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {client.gstin ? (
            <span className="badge badge-paid">GST</span>
          ) : (
            <span className="badge badge-draft">Unregistered</span>
          )}
          {client.tds_applicable && (
            <span className="badge bg-amber-100 text-amber-700">TDS</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
        <Building size={40} className="text-text-muted" />
      </div>
      <h3 className="font-display text-xl text-text-primary mb-2">No clients yet</h3>
      <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
        Add your first client to start creating invoices and tracking payments.
      </p>
      <button onClick={onAdd} className="btn btn-primary">
        <Plus size={18} />
        Add Your First Client
      </button>
    </div>
  );
}

export default function Clients() {
  const { state, fetchClients, createClient, updateClient, deleteClient, verifyGSTIN, openModal, showToast } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = state.clients.filter((client) =>
    (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.gstin || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleSaveClient = async (formData) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      // Refresh clients list after save
      fetchClients();
      setShowModal(false);
      setEditingClient(null);
    } catch (error) {
      showToast('Failed to save client', 'error');
    }
  };

  const handleDeleteClient = (client) => {
    openModal('deleteConfirm', { type: 'client', item: client });
  };

  const handleViewInvoices = (client) => {
    navigate(`/invoices?client=${client.id}`);
  };

  const handleCreateInvoice = (client) => {
    navigate(`/invoices/new?client=${client.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-1">Clients</h1>
          <p className="text-text-secondary">
            Manage your client database and their GST/TDS details
          </p>
        </div>
        <button onClick={handleAddClient} className="btn btn-primary">
          <Plus size={18} />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or GSTIN..."
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
      </div>

      {/* Client Grid */}
      {state.loading.clients ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-accent" />
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onDelete={handleDeleteClient}
              onEdit={handleEditClient}
              onViewInvoices={handleViewInvoices}
              onCreateInvoice={handleCreateInvoice}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          {searchQuery ? (
            <div className="text-center py-12">
              <Search size={40} className="mx-auto mb-4 text-text-muted" />
              <h3 className="font-semibold text-lg text-text-primary mb-2">No clients found</h3>
              <p className="text-text-secondary text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <EmptyState onAdd={handleAddClient} />
          )}
        </div>
      )}

      {/* Client Modal */}
      <ClientModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingClient(null); }}
        onSave={handleSaveClient}
        client={editingClient}
        verifyGSTIN={verifyGSTIN}
      />
    </div>
  );
}
