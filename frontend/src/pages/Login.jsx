import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { Eye, EyeOff, Mail, ArrowRight, Check, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, showToast } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        showToast('Welcome back!', 'success');
        navigate('/');
      }
    } catch (error) {
      setErrors({ general: error.message || 'Login failed. Please check your credentials.' });
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Attempt login with demo credentials
      const success = await login('demo@invoicein.in', 'demo1234');
      if (success) {
        showToast('Welcome! Logged in with demo account.', 'success');
        navigate('/');
      }
    } catch (error) {
      // If API fails, use mock data for demo purposes
      console.log('Demo login via API failed, using mock data');
      
      // Store mock user data for demo
      localStorage.setItem('demo_user', JSON.stringify({
        id: 1,
        name: 'Priya Sharma',
        email: 'demo@invoicein.in',
        phone: '+91 98765 43210',
        business_name: 'Creative Studio LLP',
        business_type: 'Partnership',
        state: 'Maharashtra',
        gstin: '27AAACL1234C1ZA',
        plan: 'Pro',
        brand_color: '#E07A29',
      }));
      
      // Set tokens for demo
      localStorage.setItem('access_token', 'demo_token');
      localStorage.setItem('refresh_token', 'demo_refresh_token');
      
      showToast('Welcome! Logged in with demo account.', 'success');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white rounded-full" />
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
              <p className="text-sm text-white/60">Smart Invoicing</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-4xl text-white leading-tight mb-4">
                Invoicing that<br />
                <span className="text-accent-light">understands GST</span>
              </h2>
              <p className="text-lg text-white/70 max-w-md">
                The only invoicing platform built specifically for Indian businesses.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Smart GST Automation', desc: 'CGST/SGST/IGST auto-calculated' },
                { title: 'TDS Tracking', desc: 'Automatic TDS detection' },
                { title: 'Payment Reminders', desc: 'WhatsApp reminders' },
                { title: 'ITR Ready', desc: 'One-click income summary' },
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

          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
            <div>
              <p className="text-3xl font-bold text-white">15K+</p>
              <p className="text-sm text-white/60">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50Cr+</p>
              <p className="text-sm text-white/60">Invoiced</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">4.8</p>
              <p className="text-sm text-white/60">User Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-bg-main">
        <div className="w-full max-w-md">
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

          <div className="text-center mb-8">
            <h2 className="font-display text-2xl text-text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary">Sign in to continue to your dashboard</p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  className={`input pl-11 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="you@company.com"
                  required
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  className={`input pr-11 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm text-accent hover:underline">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          <div className="relative flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-sm text-text-muted">or</span>
            <div className="flex-1 h-px bg-border-light" />
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn btn-secondary w-full py-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Loading...
              </span>
            ) : (
              'Try Demo Account'
            )}
          </button>

          <p className="text-center text-sm text-text-secondary mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent font-semibold hover:underline">
              Sign Up Free
            </Link>
          </p>

          <p className="text-center text-xs text-text-muted mt-6">
            By continuing, you agree to InvoiceIN's{' '}
            <Link to="/terms" className="text-accent hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}