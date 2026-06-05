import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Mail, Phone, ArrowRight, Building, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function Register() {
  const navigate = useNavigate();
  const { register, login, showToast } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    business_name: '',
    business_type: 'individual',
    state: 'Maharashtra',
    gstin: '',
    city: '',
    pincode: '',
  });

  const businessTypes = [
    { value: 'individual', label: 'Individual / Sole Proprietor' },
    { value: 'proprietorship', label: 'Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_limited', label: 'Private Limited' },
    { value: 'llp', label: 'LLP' },
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
  ];

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required';
    }
    if (!formData.state) {
      newErrors.state = 'State is required';
    }
    if (formData.gstin && formData.gstin.length > 0 && formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      // Prepare registration data
      const registrationData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        business_name: formData.business_name,
        business_type: formData.business_type,
        state: formData.state,
        gstin: formData.gstin || null,
        city: formData.city || '',
        pincode: formData.pincode || '',
      };

      // Call registration API
      await register(registrationData);

      // After successful registration, log in automatically
      const loginSuccess = await login(formData.email, formData.password);
      
      if (loginSuccess) {
        showToast('Account created successfully! Welcome to InvoiceIN.', 'success');
        navigate('/');
      } else {
        // If auto-login fails, redirect to login page
        showToast('Account created. Please login with your credentials.', 'success');
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-white rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl text-white">InvoiceIN</h1>
              <p className="text-sm text-white/60">Smart Invoicing for India</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-4xl text-white leading-tight mb-4">
                Start your<br />
                <span className="text-accent-light">free trial</span>
              </h2>
              <p className="text-lg text-white/70 max-w-md">
                Join thousands of Indian businesses managing invoices and taxes effortlessly.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: '5 Free Invoices', desc: 'No credit card required' },
                { title: 'GST Automation', desc: 'Auto CGST/SGST/IGST calculation' },
                { title: 'Payment Reminders', desc: 'Automatic WhatsApp reminders' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-accent-light" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/50">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-bg-main overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="font-display text-2xl text-text-primary">InvoiceIN</h1>
          </div>

          <div className="text-center mb-6">
            <h2 className="font-display text-2xl text-text-primary mb-2">Create your account</h2>
            <p className="text-text-secondary">Start managing invoices in minutes</p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
            )}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <div className={clsx(
              "w-16 h-0.5",
              step >= 2 ? "bg-primary" : "bg-gray-200"
            )} />
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
            )}>
              2
            </div>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={clsx("input", errors.name && "border-red-500")}
                  placeholder="Your name"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="label">Email Address *</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={clsx("input pl-10", errors.email && "border-red-500")}
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input pl-10"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={clsx("input pr-11", errors.password && "border-red-500")}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="label">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={clsx("input", errors.confirmPassword && "border-red-500")}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3 mt-6"
              >
                <span className="flex items-center gap-2">
                  Next: Business Details
                  <ArrowRight size={18} />
                </span>
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Business Name *</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  className={clsx("input", errors.business_name && "border-red-500")}
                  placeholder="Your business name"
                />
                {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Business Type</label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => handleInputChange('business_type', e.target.value)}
                    className="input"
                  >
                    {businessTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={clsx("input", errors.state && "border-red-500")}
                  >
                    <option value="">Select State</option>
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="input"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="input"
                    placeholder="400001"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="label">GSTIN (optional)</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                  className={clsx("input font-mono", errors.gstin && "border-red-500")}
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                />
                {errors.gstin && <p className="text-red-500 text-xs mt-1">{errors.gstin}</p>}
                <p className="text-xs text-text-muted mt-1">
                  Skip if not registered yet. You can add it later.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary flex-1 py-3"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account
                      <ArrowRight size={18} />
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}