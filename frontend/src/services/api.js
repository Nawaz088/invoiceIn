/**
 * API Service Layer for InvoiceIN
 * Handles all HTTP requests to the Django backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Token management
const TokenService = {
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
};

// Generic fetch wrapper with auth handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = TokenService.getAccessToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    let response = await fetch(url, config);

    // Handle 401 - Try to refresh token
    if (response.status === 401 && TokenService.getRefreshToken()) {
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        // Retry the original request with new token
        config.headers.Authorization = `Bearer ${TokenService.getAccessToken()}`;
        response = await fetch(url, config);
      } else {
        // Refresh failed - logout
        TokenService.clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.error || data.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }
      
      return data;
    } else {
      // Handle non-JSON responses (like file downloads)
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Request failed');
      }
      return response;
    }
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
}

// Download file helper
async function downloadFile(endpoint, filename) {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = TokenService.getAccessToken();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  return blob;
}

// Refresh access token
async function refreshAccessToken() {
  try {
    const refreshToken = TokenService.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      TokenService.setTokens(data.access, null);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============ Authentication API ============
export const AuthAPI = {
  login: async (email, password) => {
    const data = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Backend returns { tokens: { access, refresh }, user, message }
    // Extract tokens from the nested structure
    const accessToken = data.tokens?.access || data.access;
    const refreshToken = data.tokens?.refresh || data.refresh;
    TokenService.setTokens(accessToken, refreshToken);
    return data;
  },

  register: async (userData) => {
    const data = await apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Backend returns { tokens: { access, refresh }, user, message }
    // Auto-login after registration
    if (data.tokens) {
      const accessToken = data.tokens.access;
      const refreshToken = data.tokens.refresh;
      TokenService.setTokens(accessToken, refreshToken);
    }
    return data;
  },

  logout: () => {
    TokenService.clearTokens();
  },

  getProfile: async () => {
    return apiFetch('/auth/profile/');
  },

  updateProfile: async (data) => {
    return apiFetch('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  changePassword: async ({ current_password, new_password }) => {
    return apiFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: current_password, new_password }),
    });
  },

  enable2FA: async () => {
    return apiFetch('/auth/2fa/enable/', {
      method: 'POST',
    });
  },

  verify2FA: async (code) => {
    return apiFetch('/auth/2fa/verify/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  isAuthenticated: () => TokenService.isAuthenticated(),
};

// ============ Invoices API ============
export const InvoicesAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/invoices/${queryString ? `?${queryString}` : ''}`);
  },

  get: async (id) => {
    return apiFetch(`/invoices/${id}/`);
  },

  create: async (invoiceData) => {
    return apiFetch('/invoices/', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  update: async (id, invoiceData) => {
    return apiFetch(`/invoices/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(invoiceData),
    });
  },

  delete: async (id) => {
    return apiFetch(`/invoices/${id}/`, {
      method: 'DELETE',
    });
  },

  send: async (id, method = 'email') => {
    console.log("InvoicesAPI.send id =", id);
    return apiFetch(`/invoices/${id}/send/`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  },

  markPaid: async (id, paymentReference = '') => {
    return apiFetch(`/invoices/${id}/mark_paid/`, {
      method: 'POST',
      body: JSON.stringify({ payment_reference: paymentReference }),
    });
  },

  sendReminder: async (id) => {
    return apiFetch(`/invoices/${id}/send_reminder/`, {
      method: 'POST',
    });
  },

  duplicate: async (id) => {
    return apiFetch(`/invoices/${id}/duplicate/`, {
      method: 'POST',
    });
  },

  pdf: async (id, format = 'pdf') => {
    const response = await apiFetch(`/invoices/${id}/pdf`, {
      headers: {
        Authorization: `Bearer ${TokenService.getAccessToken()}`,
      },
    });
    if (format === 'html') {
      return response.text();
    }
    return response.blob();
  },

  dashboard: async () => {
    return apiFetch('/invoices/dashboard/');
  },

  generateNumber: async (prefix = 'INV') => {
    return apiFetch('/invoices/generate_number/', {
      method: 'POST',
      body: JSON.stringify({ prefix }),
    });
  },

  summary: async () => {
    return apiFetch('/invoices/summary/');
  },

  activities: async (id) => {
    return apiFetch(`/invoices/${id}/activities/`);
  },
};

// ============ Clients API ============
export const ClientsAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/clients/${queryString ? `?${queryString}` : ''}`);
  },

  get: async (id) => {
    return apiFetch(`/clients/${id}/`);
  },

  create: async (clientData) => {
    return apiFetch('/clients/', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  update: async (id, clientData) => {
    return apiFetch(`/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(clientData),
    });
  },

  delete: async (id) => {
    return apiFetch(`/clients/${id}/`, {
      method: 'DELETE',
    });
  },

  verifyGSTIN: async (gstin) => {
    return apiFetch('/clients/verify_gstin/', {
      method: 'POST',
      body: JSON.stringify({ gstin }),
    });
  },

  getInvoices: async (id) => {
    return apiFetch(`/clients/${id}/invoices/`);
  },

  getSummary: async (id) => {
    return apiFetch(`/clients/${id}/summary/`);
  },

  createInvoice: async (id, invoiceData) => {
    return apiFetch(`/clients/${id}/create_invoice/`, {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  getStates: async () => {
    return apiFetch('/clients/states/');
  },
};

// ============ Expenses API ============
export const ExpensesAPI = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/expenses/${queryString ? `?${queryString}` : ''}`);
  },

  get: async (id) => {
    return apiFetch(`/expenses/${id}/`);
  },

  create: async (expenseData) => {
    return apiFetch('/expenses/', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },

  update: async (id, expenseData) => {
    return apiFetch(`/expenses/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(expenseData),
    });
  },

  delete: async (id) => {
    return apiFetch(`/expenses/${id}/`, {
      method: 'DELETE',
    });
  },

  summary: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/expenses/summary/${queryString ? `?${queryString}` : ''}`);
  },

  itcReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/expenses/itc_report/${queryString ? `?${queryString}` : ''}`);
  },

  profitImpact: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/expenses/profit_impact/${queryString ? `?${queryString}` : ''}`);
  },
};

// ============ Reports API ============
export const ReportsAPI = {
  dashboard: async () => {
    return apiFetch('/reports/dashboard/');
  },

  revenue: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/revenue/${queryString ? `?${queryString}` : ''}`);
  },

  gstr1: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/gstr1/${queryString ? `?${queryString}` : ''}`);
  },

  gstr3b: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/gstr3b/${queryString ? `?${queryString}` : ''}`);
  },

  gstr2a: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/gstr2a/${queryString ? `?${queryString}` : ''}`);
  },

  tds: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/tds/${queryString ? `?${queryString}` : ''}`);
  },

  itr: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/itr/${queryString ? `?${queryString}` : ''}`);
  },

  profitLoss: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/profit-loss/${queryString ? `?${queryString}` : ''}`);
  },

  aging: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/aging/${queryString ? `?${queryString}` : ''}`);
  },

  exportReport: async (reportType, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports/${reportType}/export/${queryString ? `?${queryString}` : ''}`);
  },

  exportPdf: async (reportType, params = {}) => {
    return downloadFile(`/reports/${reportType}/export/pdf/?${new URLSearchParams(params)}`);
  },

  exportExcel: async (reportType, params = {}) => {
    return downloadFile(`/reports/${reportType}/export/excel/?${new URLSearchParams(params)}`);
  },
};

// ============ Payments API ============
export const PaymentsAPI = {
  createOrder: async (invoiceId, amount) => {
    return apiFetch('/payments/create-order/', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, amount }),
    });
  },

  getPaymentLink: async (invoiceId, amount) => {
    return apiFetch('/payments/payment-link/', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, amount }),
    });
  },

  verifyPayment: async (orderId, paymentId, signature) => {
    return apiFetch('/payments/verify/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, payment_id: paymentId, signature }),
    });
  },
};

// ============ Team API ============
export const TeamAPI = {
  list: async () => {
    return apiFetch('/team/');
  },

  invite: async (email, role) => {
    return apiFetch('/team/invite/', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  update: async (id, data) => {
    return apiFetch(`/team/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  remove: async (id) => {
    return apiFetch(`/team/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============ Billing API ============
export const BillingAPI = {
  getSubscription: async () => {
    return apiFetch('/billing/subscription/');
  },

  getInvoices: async () => {
    return apiFetch('/billing/invoices/');
  },

  downloadInvoice: async (invoiceId) => {
    return downloadFile(`/billing/invoices/${invoiceId}/download/`);
  },

  upgrade: async (planId) => {
    return apiFetch('/billing/upgrade/', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    });
  },

  cancelSubscription: async () => {
    return apiFetch('/billing/cancel/', {
      method: 'POST',
    });
  },
};

// ============ Settings API ============
export const SettingsAPI = {
  get: async () => {
    return apiFetch('/settings/');
  },

  update: async (data) => {
    return apiFetch('/settings/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateNotifications: async (preferences) => {
    return apiFetch('/settings/notifications/', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  },

  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await fetch(`${API_BASE_URL}/settings/logo/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TokenService.getAccessToken()}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }
    
    return response.json();
  },
};

// Export a unified API object with all methods
const api = {
  // Auth
  login: AuthAPI.login,
  register: AuthAPI.register,
  logout: AuthAPI.logout,
  getProfile: AuthAPI.getProfile,
  updateProfile: AuthAPI.updateProfile,
  changePassword: AuthAPI.changePassword,
  enable2FA: AuthAPI.enable2FA,
  
  // Invoices
  getInvoices: InvoicesAPI.list,
  getInvoice: InvoicesAPI.get,
  createInvoice: InvoicesAPI.create,
  updateInvoice: InvoicesAPI.update,
  deleteInvoice: InvoicesAPI.delete,
  sendInvoice: InvoicesAPI.send,
  updateInvoiceStatus: InvoicesAPI.markPaid,
  downloadInvoicePdf: InvoicesAPI.pdf,
  getNextInvoiceNumber: InvoicesAPI.generateNumber,
  duplicateInvoice: InvoicesAPI.duplicate,
  getInvoiceActivities: InvoicesAPI.activities,
  
  // Clients
  getClients: ClientsAPI.list,
  getClient: ClientsAPI.get,
  createClient: ClientsAPI.create,
  updateClient: ClientsAPI.update,
  deleteClient: ClientsAPI.delete,
  verifyClientGSTIN: ClientsAPI.verifyGSTIN,
  getClientInvoices: ClientsAPI.getInvoices,
  getClientSummary: ClientsAPI.getSummary,
  
  // Expenses
  getExpenses: ExpensesAPI.list,
  getExpense: ExpensesAPI.get,
  createExpense: ExpensesAPI.create,
  updateExpense: ExpensesAPI.update,
  deleteExpense: ExpensesAPI.delete,
  getExpenseSummary: ExpensesAPI.summary,
  getExpenseITCReport: ExpensesAPI.itcReport,
  getExpenseProfitImpact: ExpensesAPI.profitImpact,
  
  // Reports
  getReport: async (endpoint, params = {}) => {
    // Extract report type from endpoint
    const reportType = endpoint.replace('/reports/', '').replace('/', '');
    const reportApis = {
      'gstr1': ReportsAPI.gstr1,
      'gstr3b': ReportsAPI.gstr3b,
      'gstr2a': ReportsAPI.gstr2a,
      'tds': ReportsAPI.tds,
      'itr': ReportsAPI.itr,
      'pnl': ReportsAPI.profitLoss,
      'aging': ReportsAPI.aging,
    };
    const reportApi = reportApis[reportType] || ReportsAPI.dashboard;
    return reportApi(params);
  },
  exportReportPdf: ReportsAPI.exportPdf,
  exportReportExcel: ReportsAPI.exportExcel,
  exportInvoices: async (params = {}) => {
    return downloadFile(`/invoices/export/?${new URLSearchParams(params)}`);
  },
  
  // Payments
  createPaymentOrder: PaymentsAPI.createOrder,
  getPaymentLink: PaymentsAPI.getPaymentLink,
  verifyPayment: PaymentsAPI.verifyPayment,
  
  // Team
  getTeamMembers: TeamAPI.list,
  inviteTeamMember: TeamAPI.invite,
  updateTeamMember: TeamAPI.update,
  removeTeamMember: TeamAPI.remove,
  
  // Billing
  getSubscription: BillingAPI.getSubscription,
  getBillingHistory: BillingAPI.getInvoices,
  downloadInvoice: BillingAPI.downloadInvoice,
  upgradePlan: BillingAPI.upgrade,
  cancelSubscription: BillingAPI.cancelSubscription,
  
  // Settings
  getSettings: SettingsAPI.get,
  updateSettings: SettingsAPI.update,
  updateNotificationPreferences: SettingsAPI.updateNotifications,
  uploadLogo: SettingsAPI.uploadLogo,
  
  // Dashboard
  getDashboardData: InvoicesAPI.dashboard,
  getRevenueReport: ReportsAPI.revenue,
};

export { apiFetch, TokenService };
export default api;
