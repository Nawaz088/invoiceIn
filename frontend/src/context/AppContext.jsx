import { createContext, useContext, useReducer, useState, useEffect, useCallback } from 'react';
import { AuthAPI, InvoicesAPI, ClientsAPI, ExpensesAPI, ReportsAPI } from '../services/api';

const AppContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  clients: [],
  invoices: [],
  expenses: [],
  dashboard: {
    invoicedThisMonth: 0,
    receivedThisMonth: 0,
    overdueAmount: 0,
    gstLiability: 0,
    changeInvoiced: 0,
    changeReceived: 0,
    changeOverdue: 0,
    changeGst: 0,
  },
  notifications: [],
  modals: {
    addClient: false,
    editClient: false,
    addExpense: false,
    editExpense: false,
    invoicePreview: false,
    deleteConfirm: false,
    sendReminder: false,
    addItem: false,
    editItem: false,
  },
  selectedItem: null,
  loading: {
    global: false,
    invoices: false,
    clients: false,
    expenses: false,
  },
  error: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_DASHBOARD':
      return { ...state, dashboard: action.payload };
    case 'SET_INVOICES':
      return { ...state, invoices: action.payload, loading: { ...state.loading, invoices: false } };
    case 'ADD_INVOICE':
      return { ...state, invoices: [action.payload, ...state.invoices] };
    case 'UPDATE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map(inv =>
          inv.id === action.payload.id ? action.payload : inv
        ),
      };
    case 'DELETE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.filter(inv => inv.id !== action.payload),
      };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload, loading: { ...state.loading, clients: false } };
    case 'ADD_CLIENT':
      return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload),
      };
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload, loading: { ...state.loading, expenses: false } };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(exp =>
          exp.id === action.payload.id ? action.payload : exp
        ),
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter(exp => exp.id !== action.payload),
      };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        modals: { ...state.modals, [action.modal]: true },
        selectedItem: action.item || null,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        modals: Object.keys(state.modals).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {}),
        selectedItem: null,
      };
    case 'CLOSE_ALL':
      return { ...state, modals: Object.keys(state.modals).reduce((acc, key) => { acc[key] = false; return acc; }, {}), selectedItem: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [toast, setToast] = useState(null);

  // Toast notifications
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const notify = useCallback((message, type = 'success') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
    }, 5000);
  }, []);

  // Modal helpers
  const openModal = useCallback((modal, item = null) => {
    dispatch({ type: 'OPEN_MODAL', modal, item });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  // Authentication actions
  const login = useCallback(async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'global', value: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      // Call the login API
      const data = await AuthAPI.login(email, password);
      
      // Get user profile after successful login
      const profile = await AuthAPI.getProfile();
      dispatch({ type: 'SET_USER', payload: profile });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error; // Re-throw to allow handling in component
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'global', value: false });
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'global', value: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      // Call the registration API
      await AuthAPI.register(userData);
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error; // Re-throw to allow handling in component
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'global', value: false });
    }
  }, []);

  const logout = useCallback(() => {
    AuthAPI.logout();
    dispatch({ type: 'LOGOUT' });
    showToast('Logged out successfully', 'success');
  }, [showToast]);

  const updateProfile = useCallback(async (data) => {
    try {
      const updated = await AuthAPI.updateProfile(data);
      dispatch({ type: 'SET_USER', payload: updated });
      showToast('Profile updated', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Update failed', 'error');
      return false;
    }
  }, [showToast]);

  // Dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await ReportsAPI.dashboard();
      dispatch({ type: 'SET_DASHBOARD', payload: {
        invoicedThisMonth: data.this_month?.invoiced || 0,
        receivedThisMonth: data.this_month?.received || 0,
        overdueAmount: data.outstanding?.amount || 0,
        gstLiability: data.gst_collected?.total || 0,
      }});
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  }, []);

  // Invoice actions
  const fetchInvoices = useCallback(async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'invoices', value: true });
      const data = await InvoicesAPI.list(params);
      dispatch({ type: 'SET_INVOICES', payload: data.results || data || [] });
    } catch (error) {
      console.error('Failed to load invoices:', error);
      showToast('Failed to load invoices', 'error');
      dispatch({ type: 'SET_LOADING', key: 'invoices', value: false });
    }
  }, [showToast]);

  const createInvoice = useCallback(async (invoiceData) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'invoices', value: true });
      const invoice = await InvoicesAPI.create(invoiceData);
      dispatch({ type: 'ADD_INVOICE', payload: invoice });
      showToast('Invoice created successfully', 'success');
      closeModal();
      return invoice;
    } catch (error) {
      showToast(error.message || 'Failed to create invoice', 'error');
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'invoices', value: false });
    }
  }, [showToast, closeModal]);

  const updateInvoice = useCallback(async (id, invoiceData) => {
    try {
      const invoice = await InvoicesAPI.update(id, invoiceData);
      dispatch({ type: 'UPDATE_INVOICE', payload: invoice });
      showToast('Invoice updated', 'success');
      closeModal();
      return invoice;
    } catch (error) {
      showToast(error.message || 'Failed to update invoice', 'error');
      return null;
    }
  }, [showToast, closeModal]);

  const deleteInvoice = useCallback(async (id) => {
    try {
      await InvoicesAPI.delete(id);
      dispatch({ type: 'DELETE_INVOICE', payload: id });
      showToast('Invoice deleted', 'success');
      closeModal();
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to delete invoice', 'error');
      return false;
    }
  }, [showToast, closeModal]);

  const sendInvoice = useCallback(async (id, method = 'email') => {
    console.log("Sending invoice from app context:", id);
    try {
      await InvoicesAPI.send(id, method);
      await fetchInvoices();
      showToast('Invoice sent successfully', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to send invoice', 'error');
      return false;
    }
  }, [showToast, fetchInvoices]);

  const markInvoicePaid = useCallback(async (id, reference = '') => {
    try {
      await InvoicesAPI.markPaid(id, reference);
      await fetchInvoices();
      showToast('Invoice marked as paid', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to mark invoice as paid', 'error');
      return false;
    }
  }, [showToast, fetchInvoices]);

  const sendReminder = useCallback(async (id) => {
    try {
      await InvoicesAPI.sendReminder(id);
      showToast('Reminder sent', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to send reminder', 'error');
      return false;
    }
  }, [showToast]);

  const downloadInvoicePDF = useCallback(async (id) => {
    try {
      const blob = await InvoicesAPI.pdf(id, 'pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded', 'success');
    } catch (error) {
      console.error('PDF download error:', error);
      showToast('Failed to download PDF', 'error');
    }
  }, [showToast]);

  const duplicateInvoice = useCallback(async (id) => {
    try {
      const newInvoice = await InvoicesAPI.duplicate(id);
      dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
      showToast('Invoice duplicated', 'success');
      return newInvoice;
    } catch (error) {
      showToast(error.message || 'Failed to duplicate invoice', 'error');
      return null;
    }
  }, [showToast]);

  // Client actions
  const fetchClients = useCallback(async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'clients', value: true });
      const data = await ClientsAPI.list(params);
      dispatch({ type: 'SET_CLIENTS', payload: data.results || data || [] });
    } catch (error) {
      console.error('Failed to load clients:', error);
      showToast('Failed to load clients', 'error');
      dispatch({ type: 'SET_LOADING', key: 'clients', value: false });
    }
  }, [showToast]);

  const createClient = useCallback(async (clientData) => {
    try {
      const client = await ClientsAPI.create(clientData);
      dispatch({ type: 'ADD_CLIENT', payload: client });
      showToast('Client added successfully', 'success');
      closeModal();
      return client;
    } catch (error) {
      showToast(error.message || 'Failed to add client', 'error');
      return null;
    }
  }, [showToast, closeModal]);

  const updateClient = useCallback(async (id, clientData) => {
    try {
      const client = await ClientsAPI.update(id, clientData);
      dispatch({ type: 'UPDATE_CLIENT', payload: client });
      showToast('Client updated', 'success');
      closeModal();
      return client;
    } catch (error) {
      showToast(error.message || 'Failed to update client', 'error');
      return null;
    }
  }, [showToast, closeModal]);

  const deleteClient = useCallback(async (id) => {
    try {
      await ClientsAPI.delete(id);
      dispatch({ type: 'DELETE_CLIENT', payload: id });
      showToast('Client deleted', 'success');
      closeModal();
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to delete client', 'error');
      return false;
    }
  }, [showToast, closeModal]);

  const verifyGSTIN = useCallback(async (gstin) => {
    try {
      const result = await ClientsAPI.verifyGSTIN(gstin);
      showToast('GSTIN verified successfully', 'success');
      return result;
    } catch (error) {
      showToast(error.message || 'GSTIN verification failed', 'error');
      return null;
    }
  }, [showToast]);

  // Expense actions
  const fetchExpenses = useCallback(async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'expenses', value: true });
      const data = await ExpensesAPI.list(params);
      dispatch({ type: 'SET_EXPENSES', payload: data.results || data || [] });
    } catch (error) {
      console.error('Failed to load expenses:', error);
      showToast('Failed to load expenses', 'error');
      dispatch({ type: 'SET_LOADING', key: 'expenses', value: false });
    }
  }, [showToast]);

  const createExpense = useCallback(async (expenseData) => {
    try {
      const expense = await ExpensesAPI.create(expenseData);
      dispatch({ type: 'ADD_EXPENSE', payload: expense });
      showToast('Expense added successfully', 'success');
      closeModal();
      return expense;
    } catch (error) {
      showToast(error.message || 'Failed to add expense', 'error');
      return null;
    }
  }, [showToast, closeModal]);

  const updateExpense = useCallback(async (id, expenseData) => {
    try {
      const expense = await ExpensesAPI.update(id, expenseData);
      dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
      showToast('Expense updated', 'success');
      closeModal();
      return expense;
    } catch (error) {
      showToast(error.message || 'Failed to update expense', 'error');
      return null;
    }
  }, [showToast, closeModal]);

  const deleteExpense = useCallback(async (id) => {
    try {
      await ExpensesAPI.delete(id);
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
      showToast('Expense deleted', 'success');
      closeModal();
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to delete expense', 'error');
      return false;
    }
  }, [showToast, closeModal]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (AuthAPI.isAuthenticated()) {
        try {
          const profile = await AuthAPI.getProfile();
          dispatch({ type: 'SET_USER', payload: profile });
        } catch (error) {
          console.error('Auth check failed:', error);
          AuthAPI.logout();
        }
      }
    };
    checkAuth();
  }, []);

  const value = {
    state,
    dispatch,
    toast,
    showToast,
    notify,
    openModal,
    closeModal,
    // Auth
    login,
    register,
    logout,
    updateProfile,
    // Dashboard
    fetchDashboard,
    // Invoices
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    markInvoicePaid,
    sendReminder,
    downloadInvoicePDF,
    duplicateInvoice,
    // Clients
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    verifyGSTIN,
    // Expenses
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export default AppContext;