import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import api from '../services/api'
import { 
  User, 
  Building, 
  CreditCard, 
  Bell, 
  Shield, 
  Users,
  Globe,
  Palette,
  Upload,
  Camera,
  Check,
  AlertCircle,
  ChevronRight,
  Download,
  LogOut,
  FileText,
  X,
  Loader2,
  Trash2,
  Mail,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react'
import clsx from 'clsx'

const tabs = [
  { id: 'business', label: 'Business Profile', icon: Building },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'team', label: 'Team & Access', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
]

const brandColors = ['#E07A29', '#1E3A5F', '#2D8B57', '#C94A4A', '#6B7280', '#8B5CF6']

function BusinessProfileTab({ user, onSave, saving }) {
  const [formData, setFormData] = useState({
    business_name: user?.business_name || user?.businessName || '',
    business_type: user?.business_type || user?.businessType || 'Proprietorship',
    state: user?.state || '',
    gstin: user?.gstin || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
    pan: user?.pan || ''
  })
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.business_name) {
      newErrors.business_name = 'Business name is required'
    }
    
    if (!formData.state) {
      newErrors.state = 'State is required'
    }
    
    if (formData.gstin && formData.gstin.length > 0 && formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-text-primary mb-4">Business Profile</h3>
        <p className="text-sm text-text-secondary mb-6">
          Update your business information that appears on invoices and tax documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Business Name *</label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => {
              setFormData({ ...formData, business_name: e.target.value })
              setErrors({ ...errors, business_name: null })
            }}
            className={clsx("input", errors.business_name && "border-danger")}
            placeholder="Your Business Name"
          />
          {errors.business_name && (
            <p className="text-xs text-danger mt-1">{errors.business_name}</p>
          )}
        </div>

        <div>
          <label className="label">Business Type</label>
          <select
            value={formData.business_type}
            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            className="input"
          >
            <option value="Individual">Individual / Sole Proprietor</option>
            <option value="Partnership">Partnership</option>
            <option value="Proprietorship">Proprietorship</option>
            <option value="Private Limited">Private Limited</option>
            <option value="LLP">LLP</option>
            <option value="Public Limited">Public Limited</option>
            <option value="Trust">Trust / Society</option>
          </select>
        </div>

        <div>
          <label className="label">State *</label>
          <select
            value={formData.state}
            onChange={(e) => {
              setFormData({ ...formData, state: e.target.value })
              setErrors({ ...errors, state: null })
            }}
            className={clsx("input", errors.state && "border-danger")}
          >
            <option value="">Select State</option>
            {indianStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && (
            <p className="text-xs text-danger mt-1">{errors.state}</p>
          )}
        </div>

        <div>
          <label className="label">GSTIN</label>
          <div className="relative">
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) => {
                setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                setErrors({ ...errors, gstin: null })
              }}
              className={clsx("input font-mono", errors.gstin && "border-danger")}
              maxLength={15}
              placeholder="27AAACL1234C1ZA"
            />
            {formData.gstin && formData.gstin.length === 15 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <Check size={18} />
              </span>
            )}
          </div>
          {errors.gstin && (
            <p className="text-xs text-danger mt-1">{errors.gstin}</p>
          )}
        </div>

        <div>
          <label className="label">PAN</label>
          <input
            type="text"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            className="input font-mono"
            maxLength={10}
            placeholder="AAAPL1234C"
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value })
              setErrors({ ...errors, email: null })
            }}
            className={clsx("input", errors.email && "border-danger")}
            placeholder="business@example.com"
          />
          {errors.email && (
            <p className="text-xs text-danger mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="label">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input"
            placeholder="+91 9876543210"
          />
        </div>

        <div className="md:col-span-2">
          <label className="label">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="input resize-none"
            rows={2}
            placeholder="Business Address"
          />
        </div>

        <div>
          <label className="label">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="input"
            placeholder="Mumbai"
          />
        </div>

        <div>
          <label className="label">Pincode</label>
          <input
            type="text"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            className="input"
            maxLength={6}
            placeholder="400001"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border-light">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Changes
        </button>
      </div>
    </form>
  )
}

function BrandingTab({ settings, onSave, saving }) {
  const fileInputRef = useRef(null)
  const [logoPreview, setLogoPreview] = useState(settings?.logo_url || null)
  const [brandColor, setBrandColor] = useState(settings?.brand_color || '#E07A29')
  const [formData, setFormData] = useState({
    default_payment_terms: settings?.default_payment_terms || 'Payment due within 30 days. Please include invoice number in your payment reference.',
    invoice_footer: settings?.invoice_footer || 'Thank you for your business!',
    invoice_prefix: settings?.invoice_prefix || 'INV'
  })

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    onSave({
      logo: logoPreview,
      brand_color: brandColor,
      ...formData
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-text-primary mb-4">Invoice Branding</h3>
        <p className="text-sm text-text-secondary mb-6">
          Customize how your invoices look to clients.
        </p>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div 
          className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center border-2 border-dashed border-border-light overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center">
              <Camera size={24} className="mx-auto text-text-muted mb-1" />
              <span className="text-xs text-text-muted">Logo</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleLogoUpload}
          className="hidden"
        />
        <div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary mb-2"
          >
            <Upload size={16} />
            Upload Logo
          </button>
          {logoPreview && (
            <button
              onClick={() => setLogoPreview(null)}
              className="btn btn-ghost text-danger text-sm ml-2"
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
          <p className="text-xs text-text-muted mt-2">PNG, JPG up to 2MB. Recommended: 200x200px</p>
        </div>
      </div>

      <div>
        <label className="label">Invoice Prefix</label>
        <input
          type="text"
          value={formData.invoice_prefix}
          onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
          className="input w-32 font-mono"
          placeholder="INV"
        />
      </div>

      <div>
        <label className="label">Brand Color</label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {brandColors.map(color => (
              <button
                key={color}
                className={clsx(
                  "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                  brandColor === color ? "border-primary scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => setBrandColor(color)}
              />
            ))}
          </div>
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="input w-28 font-mono"
            placeholder="#E07A29"
          />
        </div>
      </div>

      <div>
        <label className="label">Default Payment Terms</label>
        <textarea
          value={formData.default_payment_terms}
          onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
          className="input resize-none"
          rows={3}
          placeholder="Payment due within 30 days..."
        />
      </div>

      <div>
        <label className="label">Invoice Footer Notes</label>
        <textarea
          value={formData.invoice_footer}
          onChange={(e) => setFormData({ ...formData, invoice_footer: e.target.value })}
          className="input resize-none"
          rows={2}
          placeholder="Thank you for your business!"
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-border-light">
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Branding
        </button>
      </div>
    </div>
  )
}

function TeamTab({ teamMembers, onInvite, onRemove, onUpdateRole, loading }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviting, setInviting] = useState(false)

  const handleInvite = async () => {
    if (!email) return
    setInviting(true)
    await onInvite(email, role)
    setEmail('')
    setRole('viewer')
    setShowInviteForm(false)
    setInviting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-text-primary">Team Members</h3>
          <p className="text-sm text-text-secondary mt-1">Manage who has access to your account</p>
        </div>
        <button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="btn btn-primary"
        >
          <Users size={16} />
          Invite Member
        </button>
      </div>

      {showInviteForm && (
        <div className="p-4 bg-secondary rounded-lg animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input"
              >
                <option value="viewer">Viewer - Read only access</option>
                <option value="editor">Editor - Create and edit invoices</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button 
              onClick={() => setShowInviteForm(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleInvite}
              className="btn btn-primary"
              disabled={inviting || !email}
            >
              {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send Invite
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="animate-spin mx-auto text-primary mb-2" />
            <p className="text-text-secondary text-sm">Loading team members...</p>
          </div>
        ) : teamMembers?.length > 0 ? (
          teamMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4 border border-border-light rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold">
                  {member.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-text-primary">{member.name}</p>
                  <p className="text-sm text-text-muted">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.role !== 'owner' && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value)}
                      className="input py-1.5 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      onClick={() => onRemove(member.id)}
                      className="btn-icon text-text-muted hover:text-danger"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                {member.role === 'owner' && (
                  <span className="badge bg-primary/10 text-primary">Owner</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-text-muted">
            <Users size={40} className="mx-auto mb-2 opacity-50" />
            <p>No team members found</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">CA Access</p>
            <p className="text-sm text-blue-700 mt-1">
              Add your CA as a read-only member so they can pull reports directly. They won't be able to create or modify invoices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BillingTab({ subscription, invoices, onUpgrade, onDownloadInvoice }) {
  const plan = subscription || { plan: 'Free', amount: 0, renewal_date: null }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-text-primary mb-4">Current Plan</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-2">
              Current Plan
            </span>
            <h2 className="font-display text-3xl">{plan.plan || 'Free'}</h2>
            <p className="text-white/70 mt-1">
              {plan.amount > 0 ? `₹${plan.amount}/month` : 'Free forever'}
            </p>
          </div>
          {plan.renewal_date && (
            <div className="text-right">
              <p className="text-sm text-white/70">Renewal Date</p>
              <p className="font-medium">{new Date(plan.renewal_date).toLocaleDateString('en-IN')}</p>
            </div>
          )}
        </div>

        {plan.amount === 0 ? (
          <div className="space-y-2">
            <p className="text-white/80">Included features:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['10 Invoices/month', 'Basic GST Reports', 'Email Support'].map(feature => (
                <span key={feature} className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded">
                  <Check size={12} />
                  {feature}
                </span>
              ))}
            </div>
            <button onClick={onUpgrade} className="btn bg-white text-primary hover:bg-white/90">
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {['Unlimited Invoices', 'GST Automation', 'TDS Tracking', 'GSTR Export', 'Expense Tracking', '5 Team Members'].map(feature => (
              <span key={feature} className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded">
                <Check size={12} />
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-text-primary mb-4">Billing History</h3>
        <div className="space-y-2">
          {invoices?.length > 0 ? (
            invoices.map(invoice => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">{invoice.date}</p>
                  <p className="text-sm text-text-muted">{invoice.description || 'Subscription'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold">₹{invoice.amount}</span>
                  <button 
                    onClick={() => onDownloadInvoice(invoice.id)}
                    className="btn-icon text-text-muted hover:text-primary"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-text-muted">No billing history</p>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationsTab({ preferences, onSave, saving }) {
  const [notifications, setNotifications] = useState(preferences || {
    invoice_viewed: true,
    payment_received: true,
    invoice_overdue: true,
    gst_threshold: true,
    filing_deadlines: true,
    marketing: false
  })

  const toggleNotification = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    })
  }

  const notificationItems = [
    { key: 'invoice_viewed', label: 'Invoice viewed by client', description: 'Get notified when your invoice is viewed' },
    { key: 'payment_received', label: 'Payment received', description: 'Alert when a payment is processed' },
    { key: 'invoice_overdue', label: 'Invoice overdue', description: 'Daily reminder for overdue invoices' },
    { key: 'gst_threshold', label: 'GST threshold warning', description: 'Alert when approaching turnover limits' },
    { key: 'filing_deadlines', label: 'Filing deadline reminders', description: 'Reminders for GSTR and TDS deadlines' },
    { key: 'marketing', label: 'Marketing emails', description: 'Tips, updates, and special offers' },
  ]

  const handleSave = () => {
    onSave(notifications)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-text-primary mb-4">Notification Preferences</h3>
        <p className="text-sm text-text-secondary mb-6">
          Choose how you want to be notified about important events.
        </p>
      </div>

      {notificationItems.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-3 border-b border-border-light last:border-0">
          <div>
            <p className="font-medium text-text-primary">{item.label}</p>
            <p className="text-sm text-text-muted">{item.description}</p>
          </div>
          <button
            onClick={() => toggleNotification(item.key)}
            className={clsx(
              "w-12 h-6 rounded-full transition-colors relative",
              notifications[item.key] ? "bg-accent" : "bg-gray-200"
            )}
          >
            <span
              className={clsx(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                notifications[item.key] ? "left-7" : "left-1"
              )}
            />
          </button>
        </div>
      ))}

      <div className="flex justify-end pt-4 border-t border-border-light">
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Preferences
        </button>
      </div>
    </div>
  )
}

function SecurityTab({ onChangePassword, onEnable2FA, onLogout, loading }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const handlePasswordChange = () => {
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match')
      return
    }
    if (passwords.new.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    onChangePassword(passwords)
    setPasswords({ current: '', new: '', confirm: '' })
    setShowPasswordForm(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-text-primary mb-4">Security Settings</h3>
      </div>

      <div className="p-4 border border-border-light rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-text-primary">Password</p>
            <p className="text-sm text-text-muted">Last changed 45 days ago</p>
          </div>
          <button 
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="btn btn-secondary text-sm"
          >
            Change Password
          </button>
        </div>
        
        {showPasswordForm && (
          <div className="space-y-4 pt-4 border-t border-border-light animate-slide-up">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowPasswordForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handlePasswordChange}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Update Password
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border border-border-light rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">Two-Factor Authentication</p>
            <p className="text-sm text-text-muted">Add an extra layer of security</p>
          </div>
          <button 
            onClick={onEnable2FA}
            className="btn btn-secondary text-sm"
            disabled={loading}
          >
            Enable
          </button>
        </div>
      </div>

      <div className="p-4 border border-border-light rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-text-primary">Active Sessions</p>
            <p className="text-sm text-text-muted">Manage your logged-in devices</p>
          </div>
          <button className="btn btn-secondary text-sm">View All</button>
        </div>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-red-800">Delete Account</p>
            <p className="text-sm text-red-600 mt-1">Permanently delete all data</p>
          </div>
          <button className="btn bg-red-600 text-white hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { state, dispatch, showToast } = useApp()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('business')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(state?.user || {})
  const [settings, setSettings] = useState({})
  const [teamMembers, setTeamMembers] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [billingHistory, setBillingHistory] = useState([])

  useEffect(() => {
    fetchUserData()
    if (activeTab === 'team') fetchTeamMembers()
    if (activeTab === 'billing') fetchBillingInfo()
  }, [activeTab])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const response = await api.getProfile()
      setUser(response.data)
      setSettings(response.data.settings || {})
      dispatch({ type: 'SET_USER', payload: response.data })
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await api.getTeamMembers()
      setTeamMembers(response.data || [])
    } catch (err) {
      console.error('Error fetching team members:', err)
    }
  }

  const fetchBillingInfo = async () => {
    try {
      const response = await api.getSubscription()
      setSubscription(response.data)
      const invoicesResponse = await api.getBillingHistory()
      setBillingHistory(invoicesResponse.data || [])
    } catch (err) {
      console.error('Error fetching billing info:', err)
    }
  }

  const handleSaveBusinessProfile = async (formData) => {
    setSaving(true)
    try {
      const response = await api.updateProfile(formData)
      setUser(response.data)
      dispatch({ type: 'SET_USER', payload: response.data })
      showToast('Business profile updated successfully!', 'success')
    } catch (err) {
      console.error('Error saving profile:', err)
      showToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBranding = async (formData) => {
    setSaving(true)
    try {
      await api.updateSettings(formData)
      setSettings({ ...settings, ...formData })
      showToast('Branding settings saved successfully!', 'success')
    } catch (err) {
      console.error('Error saving branding:', err)
      showToast(err.message || 'Failed to save branding settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteTeamMember = async (email, role) => {
    try {
      await api.inviteTeamMember({ email, role })
      showToast(`Invitation sent to ${email}`, 'success')
      fetchTeamMembers()
    } catch (err) {
      console.error('Error inviting team member:', err)
      showToast(err.message || 'Failed to send invitation', 'error')
    }
  }

  const handleRemoveTeamMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    try {
      await api.removeTeamMember(memberId)
      showToast('Team member removed', 'success')
      fetchTeamMembers()
    } catch (err) {
      console.error('Error removing team member:', err)
      showToast(err.message || 'Failed to remove team member', 'error')
    }
  }

  const handleUpdateTeamRole = async (memberId, role) => {
    try {
      await api.updateTeamMember(memberId, { role })
      showToast('Role updated successfully', 'success')
      fetchTeamMembers()
    } catch (err) {
      console.error('Error updating role:', err)
      showToast(err.message || 'Failed to update role', 'error')
    }
  }

  const handleSaveNotifications = async (preferences) => {
    setSaving(true)
    try {
      await api.updateNotificationPreferences(preferences)
      showToast('Notification preferences saved!', 'success')
    } catch (err) {
      console.error('Error saving notifications:', err)
      showToast(err.message || 'Failed to save preferences', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (passwords) => {
    setSaving(true)
    try {
      await api.changePassword({
        current_password: passwords.current,
        new_password: passwords.new
      })
      showToast('Password changed successfully!', 'success')
    } catch (err) {
      console.error('Error changing password:', err)
      showToast(err.message || 'Failed to change password', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    try {
      const response = await api.enable2FA()
      showToast('2FA enabled! Please scan the QR code with your authenticator app.', 'success')
      // In production, show QR code modal here
    } catch (err) {
      console.error('Error enabling 2FA:', err)
      showToast(err.message || 'Failed to enable 2FA', 'error')
    }
  }

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const blob = await api.downloadInvoice(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('Invoice downloaded!', 'success')
    } catch (err) {
      console.error('Error downloading invoice:', err)
      showToast('Failed to download invoice', 'error')
    }
  }

  const handleUpgrade = () => {
    showToast('Redirecting to upgrade page...', 'info')
    // In production, redirect to payment page
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <BusinessProfileTab 
            user={user} 
            onSave={handleSaveBusinessProfile}
            saving={saving}
          />
        )
      case 'branding':
        return (
          <BrandingTab 
            settings={settings}
            onSave={handleSaveBranding}
            saving={saving}
          />
        )
      case 'team':
        return (
          <TeamTab 
            teamMembers={teamMembers}
            onInvite={handleInviteTeamMember}
            onRemove={handleRemoveTeamMember}
            onUpdateRole={handleUpdateTeamRole}
            loading={loading}
          />
        )
      case 'billing':
        return (
          <BillingTab 
            subscription={subscription}
            invoices={billingHistory}
            onUpgrade={handleUpgrade}
            onDownloadInvoice={handleDownloadInvoice}
          />
        )
      case 'notifications':
        return (
          <NotificationsTab 
            preferences={settings.notification_preferences}
            onSave={handleSaveNotifications}
            saving={saving}
          />
        )
      case 'security':
        return (
          <SecurityTab 
            onChangePassword={handleChangePassword}
            onEnable2FA={handleEnable2FA}
            loading={saving}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-text-primary mb-1">Settings</h1>
        <p className="text-text-secondary">
          Manage your account, business profile, and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-secondary"
                )}
              >
                <tab.icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card">
          {loading && activeTab !== 'team' && activeTab !== 'billing' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  )
}
