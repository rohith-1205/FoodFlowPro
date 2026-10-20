import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Printer,
  Download,
  Filter,
  Eye,
  Check,
  X,
  PieChart,
  BarChart2,
  Layers,
  Utensils
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ManagerDashboard = () => {
  const { authFetch } = useAuth();
  const { socket, isConnected } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: kpis, menu, live-orders, reports
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    ['kpis', 'menu', 'live-orders', 'reports'].includes(tabParam) ? tabParam : 'kpis'
  );

  useEffect(() => {
    if (tabParam && ['kpis', 'menu', 'live-orders', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Notification Toast Helper
  const [toastMessage, setToastMessage] = useState(null);
  const showLocalToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ----------------------------------------------------
  // TAB 1: OPERATIONAL KPIS STATE & DATA
  // ----------------------------------------------------
  const [kpiData, setKpiData] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    try {
      setKpisLoading(true);
      const res = await authFetch('/manager/kpis');
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
      }
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setKpisLoading(false);
    }
  }, [authFetch]);

  // ----------------------------------------------------
  // TAB 2: MENU CRUD STATE & DATA
  // ----------------------------------------------------
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');

  // Modal states for Menu
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
    image: '',
    isAvailable: true
  });
  const [formError, setFormError] = useState('');

  const fetchMenuItems = useCallback(async () => {
    try {
      setMenuLoading(true);
      const res = await authFetch('/manager/menu');
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    } finally {
      setMenuLoading(false);
    }
  }, [authFetch]);

  // Menu Actions
  const handleOpenAdd = () => {
    setMenuFormData({
      name: '',
      description: '',
      price: '',
      category: 'Mains',
      image: '',
      isAvailable: true
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setMenuFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image: item.image || '',
      isAvailable: item.isAvailable
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!menuFormData.name.trim()) {
      setFormError('Dish name is required');
      return;
    }
    const numPrice = parseFloat(menuFormData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Please enter a valid positive price');
      return;
    }

    try {
      if (editingItem) {
        // Edit Item
        const res = await authFetch(`/manager/menu/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...menuFormData, price: numPrice })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to update dish');
        }
        const updated = await res.json();
        setMenuItems(prev => prev.map(m => m._id === updated._id ? updated : m));
        setIsEditModalOpen(false);
        showLocalToast(`Updated "${updated.name}" successfully!`);
      } else {
        // Add Item
        const res = await authFetch('/manager/menu', {
          method: 'POST',
          body: JSON.stringify({ ...menuFormData, price: numPrice })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to add dish');
        }
        const created = await res.json();
        setMenuItems(prev => [created, ...prev]);
        setIsAddModalOpen(false);
        showLocalToast(`Added new dish "${created.name}"!`);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleToggleStock = async (item) => {
    try {
      // Optimistic update
      setMenuItems(prev =>
        prev.map(m => (m._id === item._id ? { ...m, isAvailable: !m.isAvailable } : m))
      );
      const res = await authFetch(`/manager/menu/${item._id}/toggle`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Toggle failed');
      const data = await res.json();
      showLocalToast(data.message || 'Dish status toggled');
    } catch (err) {
      // Revert on failure
      setMenuItems(prev =>
        prev.map(m => (m._id === item._id ? { ...m, isAvailable: item.isAvailable } : m))
      );
      showLocalToast('Failed to toggle dish availability', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      const res = await authFetch(`/manager/menu/${deleteConfirmItem._id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setMenuItems(prev => prev.filter(m => m._id !== deleteConfirmItem._id));
      showLocalToast(`Deleted "${deleteConfirmItem.name}"`);
      setDeleteConfirmItem(null);
    } catch (err) {
      showLocalToast('Failed to delete dish', 'error');
    }
  };

  // ----------------------------------------------------
  // TAB 3: LIVE OPERATIONS MONITOR STATE & DATA
  // ----------------------------------------------------
  const [liveOrders, setLiveOrders] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFilterStatus, setLiveFilterStatus] = useState('All');
  const [liveFilterType, setLiveFilterType] = useState('All');
  const [liveSearch, setLiveSearch] = useState('');
  const [inspectOrder, setInspectOrder] = useState(null);

  const fetchLiveOrders = useCallback(async () => {
    try {
      setLiveLoading(true);
      const res = await authFetch('/manager/live-orders');
      if (res.ok) {
        const data = await res.json();
        setLiveOrders(data);
      }
    } catch (err) {
      console.error('Failed to load live orders:', err);
    } finally {
      setLiveLoading(false);
    }
  }, [authFetch]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await authFetch(`/manager/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (!res.ok) throw new Error('Failed to cancel order');
      setLiveOrders(prev =>
        prev.map(o => (o._id === orderId ? { ...o, status: 'Cancelled' } : o))
      );
      if (inspectOrder && inspectOrder._id === orderId) {
        setInspectOrder(prev => ({ ...prev, status: 'Cancelled' }));
      }
      showLocalToast(`Order #${orderId.slice(-6).toUpperCase()} cancelled`);
      fetchKPIs();
    } catch (err) {
      showLocalToast('Failed to cancel order', 'error');
    }
  };

  // ----------------------------------------------------
  // TAB 4: SALES & OPERATIONS REPORTS STATE & DATA
  // ----------------------------------------------------
  const [reportRange, setReportRange] = useState('month');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReports = useCallback(async (range) => {
    try {
      setReportLoading(true);
      const res = await authFetch(`/manager/reports?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setReportLoading(false);
    }
  }, [authFetch]);

  // Initial loads
  useEffect(() => {
    fetchKPIs();
    fetchMenuItems();
    fetchLiveOrders();
    fetchReports(reportRange);
  }, [fetchKPIs, fetchMenuItems, fetchLiveOrders, fetchReports, reportRange]);

  // Socket.IO Real-time Sync for Manager
  useEffect(() => {
    if (!socket) return;

    // Join manager role room
    socket.emit('join_role', 'manager');
    socket.emit('join_room', 'role_manager');

    const handleNewOrder = (order) => {
      setLiveOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]);
      fetchKPIs();
      showLocalToast(`New ${order.orderType} order received! Total: $${order.totalAmount}`);
    };

    const handleStatusUpdate = (data) => {
      const orderId = data.orderId || data._id;
      const status = data.status;
      setLiveOrders(prev =>
        prev.map(o => (o._id === orderId ? { ...o, status } : o))
      );
      fetchKPIs();
    };

    const handleMenuUpdated = () => {
      fetchMenuItems();
    };

    socket.on('order:created', handleNewOrder);
    socket.on('new_order', handleNewOrder);
    socket.on('order:status_update', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('menu_updated', handleMenuUpdated);
    socket.on('menu_item_toggled', handleMenuUpdated);

    return () => {
      socket.off('order:created', handleNewOrder);
      socket.off('new_order', handleNewOrder);
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('menu_updated', handleMenuUpdated);
      socket.off('menu_item_toggled', handleMenuUpdated);
    };
  }, [socket, fetchKPIs, fetchMenuItems]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch = !menuSearch || item.name.toLowerCase().includes(menuSearch.toLowerCase()) || (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
      const matchStock = selectedAvailability === 'All' ||
        (selectedAvailability === 'In Stock' && item.isAvailable) ||
        (selectedAvailability === 'Out of Stock' && !item.isAvailable);
      return matchCat && matchSearch && matchStock;
    });
  }, [menuItems, selectedCategory, menuSearch, selectedAvailability]);

  // Filtered Live Orders
  const filteredLiveOrders = useMemo(() => {
    return liveOrders.filter(order => {
      const matchStatus = liveFilterStatus === 'All' || order.status === liveFilterStatus;
      const matchType = liveFilterType === 'All' || order.orderType === liveFilterType;
      const idMatch = String(order._id).toLowerCase().includes(liveSearch.toLowerCase());
      const customerMatch = order.customerId?.name?.toLowerCase().includes(liveSearch.toLowerCase());
      const tableMatch = order.tableNumber && String(order.tableNumber).includes(liveSearch);
      return matchStatus && matchType && (!liveSearch || idMatch || customerMatch || tableMatch);
    });
  }, [liveOrders, liveFilterStatus, liveFilterType, liveSearch]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.dailySales) return;
    const headers = ['Date', 'Orders Count', 'Dine-In', 'Delivery', 'Subtotal ($)', 'Tax ($)', 'Total Sales ($)'];
    const rows = reportData.dailySales.map(d => [
      d._id,
      d.orderCount,
      d.dineInOrders,
      d.deliveryOrders,
      d.subtotal.toFixed(2),
      d.taxAmount.toFixed(2),
      d.totalSales.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${reportRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    const map = {
      'Pending': 'badge-warning',
      'Confirmed': 'badge-info',
      'Preparing': 'badge-primary',
      'Ready': 'badge-ready',
      'Out for Delivery': 'badge-transit',
      'Delivered': 'badge-success',
      'Cancelled': 'badge-danger'
    };
    return <span className={`status-pill ${map[status] || 'badge-secondary'}`}>{status}</span>;
  };

  return (
    <div className="manager-dashboard-page" style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.75rem 1.25rem' }}>
      {/* Toast alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.type === 'error' ? <X size={18} /> : <Check size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Overview Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Manager Control Center
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isConnected ? '#10b981' : '#ef4444'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
              {isConnected ? 'Real-Time Live' : 'Reconnecting'}
            </span>
          </div>
          <p style={{ color: 'var(--muted-color)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Operational metrics, end-to-end menu CRUD, live kitchen & delivery monitor, and financial reports.
          </p>
        </div>

        {/* Global Action / Refresh */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => { fetchKPIs(); fetchMenuItems(); fetchLiveOrders(); }}
            className="action-button-secondary"
            title="Refresh dashboard data"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1rem', borderRadius: '10px' }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          {activeTab === 'menu' && (
            <button
              onClick={handleOpenAdd}
              className="action-button-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.15rem', borderRadius: '10px' }}
            >
              <Plus size={17} />
              <span>Add New Dish</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="manager-tabs-bar" style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--line-color)',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => switchTab('kpis')}
          className={`tab-btn ${activeTab === 'kpis' ? 'tab-btn-active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'kpis' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'kpis' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <BarChart2 size={18} />
          <span>Operational KPIs</span>
        </button>

        <button
          onClick={() => switchTab('menu')}
          className={`tab-btn ${activeTab === 'menu' ? 'tab-btn-active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'menu' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'menu' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <Utensils size={18} />
          <span>Menu Management ({menuItems.length})</span>
        </button>

        <button
          onClick={() => switchTab('live-orders')}
          className={`tab-btn ${activeTab === 'live-orders' ? 'tab-btn-active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'live-orders' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'live-orders' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <Layers size={18} />
          <span>Live Operations Monitor ({liveOrders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length} Active)</span>
        </button>

        <button
          onClick={() => switchTab('reports')}
          className={`tab-btn ${activeTab === 'reports' ? 'tab-btn-active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'reports' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'reports' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <PieChart size={18} />
          <span>Sales & Reports</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERATIONAL KPIS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'kpis' && (
        <div className="tab-content-kpis">
          {kpisLoading && !kpiData ? (
            <div className="loading-center">Calculating restaurant metrics...</div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {/* Today's Revenue */}
                <div className="kpi-card" style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Today's Revenue</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#10b981' }}>
                        ${kpiData?.metrics?.revenueToday?.toFixed(2) || '0.00'}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
                      <DollarSign size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingUp size={14} /> {kpiData?.trends?.revenueTodayTrend || '+12.5%'}
                    </span>
                    <span style={{ color: 'var(--muted-color)' }}>• {kpiData?.metrics?.ordersToday || 0} orders today</span>
                  </div>
                </div>

                {/* Month Revenue */}
                <div className="kpi-card" style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>This Month</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#3b82f6' }}>
                        ${kpiData?.metrics?.revenueThisMonth?.toFixed(2) || '0.00'}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                      <TrendingUp size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>{kpiData?.metrics?.ordersThisMonth || 0} total monthly orders placed</span>
                  </div>
                </div>

                {/* Active Occupied Tables */}
                <div className="kpi-card" style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Active Tables</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#f59e0b' }}>
                        {kpiData?.metrics?.occupiedTables || 0} <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--muted-color)' }}>/ {kpiData?.metrics?.totalTables || 10}</span>
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
                      <Users size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>{kpiData?.metrics?.availableTables || 0} Available • {kpiData?.metrics?.reservedTables || 0} Reserved</span>
                  </div>
                </div>

                {/* Average Preparation Turnaround Time */}
                <div className="kpi-card" style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Avg Prep Turnaround</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#8b5cf6' }}>
                        {kpiData?.metrics?.avgPrepTimeMinutes || 14.5} <span style={{ fontSize: '1rem', fontWeight: 600 }}>min</span>
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '10px', borderRadius: '12px' }}>
                      <Clock size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>Delivery avg: {kpiData?.metrics?.avgDeliveryTimeMinutes || 28.0} min</span>
                  </div>
                </div>
              </div>

              {/* Order Status Counters Banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                background: 'var(--surface-color)',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid var(--line-color)',
                marginBottom: '2rem'
              }}>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', fontWeight: 600 }}>Total Lifetime Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{kpiData?.metrics?.totalOrders || 0}</div>
                </div>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Completed Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>{kpiData?.metrics?.completedOrders || 0}</div>
                </div>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>Cancelled Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>{kpiData?.metrics?.cancelledOrders || 0}</div>
                </div>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>Dine-In Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#3b82f6' }}>{kpiData?.metrics?.dineInCount || 0}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Delivery Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>{kpiData?.metrics?.deliveryCount || 0}</div>
                </div>
              </div>

              {/* Visual Visualizations: Categories & Top Selling Dishes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
                {/* CSS Bar Chart: Sales & Orders by Category */}
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Orders by Category</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted-color)' }}>Revenue Breakdown</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {kpiData?.categoryBreakdown?.map((cat, idx) => {
                      const maxSales = Math.max(...kpiData.categoryBreakdown.map(c => c.sales), 1);
                      const percent = Math.min(100, Math.round((cat.sales / maxSales) * 100));
                      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
                      const barColor = colors[idx % colors.length];

                      return (
                        <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{cat.category}</span>
                            <span style={{ color: 'var(--muted-color)' }}>
                              {cat.quantity} sold • <strong>${cat.sales.toFixed(2)}</strong>
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--line-color)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.max(6, percent)}%`,
                              height: '100%',
                              backgroundColor: barColor,
                              borderRadius: '10px',
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top-Selling Items Leaderboard */}
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Top Selling Dishes</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted-color)' }}>By Volume Sold</span>
                  </div>

                  {kpiData?.topItems && kpiData.topItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {kpiData.topItems.map((item, idx) => (
                        <div key={item.name} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--line-color)',
                          borderRadius: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem'
                            }}>
                              {idx + 1}
                            </span>
                            <div>
                              <strong style={{ fontSize: '0.92rem' }}>{item.name}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--muted-color)' }}>{item.quantity} orders placed</div>
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>
                            ${item.sales.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-color)' }}>
                      No dish order data recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MENU MANAGEMENT (FULL CRUD)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'menu' && (
        <div className="tab-content-menu">
          {/* Controls Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--line-color)',
            marginBottom: '1.5rem'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color)' }} />
              <input
                type="text"
                placeholder="Search dish by name or description..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid var(--line-color)',
                  background: 'rgba(0,0,0,0.15)',
                  color: 'inherit',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['All', 'Starters', 'Mains', 'Pizza', 'Desserts', 'Beverages'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: selectedCategory === cat ? 'var(--primary-color)' : 'transparent',
                    color: selectedCategory === cat ? '#fff' : 'var(--muted-color)',
                    borderColor: selectedCategory === cat ? 'var(--primary-color)' : 'var(--line-color)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stock Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>Stock:</span>
              <select
                value={selectedAvailability}
                onChange={e => setSelectedAvailability(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-color)',
                  background: 'var(--surface-color)',
                  color: 'inherit',
                  fontSize: '0.82rem'
                }}
              >
                <option value="All">All Items</option>
                <option value="In Stock">In Stock Only</option>
                <option value="Out of Stock">Out of Stock Only</option>
              </select>
            </div>
          </div>

          {/* Menu Items Table / Grid */}
          {menuLoading ? (
            <div className="loading-center">Loading menu catalogue...</div>
          ) : filteredMenuItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)'
            }}>
              <Utensils size={40} style={{ color: 'var(--muted-color)', marginBottom: '1rem' }} />
              <h3>No dishes found</h3>
              <p style={{ color: 'var(--muted-color)', fontSize: '0.9rem' }}>Try clearing your search query or filters.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Dish</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Category</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Price</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Availability</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMenuItems.map(item => (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--line-color)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                            alt={item.name}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'; }}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{item.name}</strong>
                            <small style={{ color: 'var(--muted-color)', display: 'block', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.description || 'No description'}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'inherit'
                        }}>
                          {item.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                        ${Number(item.price).toFixed(2)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStock(item)}
                          title="Click to toggle in-stock / out-of-stock"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none',
                            background: item.isAvailable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.isAvailable ? '#10b981' : '#ef4444',
                            transition: 'transform 0.1s'
                          }}
                        >
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: item.isAvailable ? '#10b981' : '#ef4444'
                          }} />
                          {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                        </button>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit dish"
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: 'none',
                              color: '#3b82f6',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            title="Delete dish"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add / Edit Dish Modal */}
          {(isAddModalOpen || isEditModalOpen) && (
            <div className="modal-backdrop" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 10000,
              padding: '1rem'
            }}>
              <div style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--line-color)',
                borderRadius: '18px',
                width: '100%',
                maxWidth: '520px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                    {isEditModalOpen ? 'Edit Dish Details' : 'Add New Dish to Menu'}
                  </h3>
                  <button
                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {formError && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Dish Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Truffle Woodfired Pizza"
                      value={menuFormData.name}
                      onChange={e => setMenuFormData({ ...menuFormData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--line-color)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'inherit',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="14.99"
                        value={menuFormData.price}
                        onChange={e => setMenuFormData({ ...menuFormData, price: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--line-color)',
                          background: 'rgba(0,0,0,0.2)',
                          color: 'inherit',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Category *</label>
                      <select
                        value={menuFormData.category}
                        onChange={e => setMenuFormData({ ...menuFormData, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--line-color)',
                          background: 'rgba(0,0,0,0.2)',
                          color: 'inherit',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="Starters">Starters</option>
                        <option value="Mains">Mains</option>
                        <option value="Pizza">Pizza</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Beverages">Beverages</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Ingredients, preparation details, allergen notes..."
                      value={menuFormData.description}
                      onChange={e => setMenuFormData({ ...menuFormData, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--line-color)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'inherit',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={menuFormData.image}
                      onChange={e => setMenuFormData({ ...menuFormData, image: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--line-color)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'inherit',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      id="isAvailableCheckbox"
                      checked={menuFormData.isAvailable}
                      onChange={e => setMenuFormData({ ...menuFormData, isAvailable: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isAvailableCheckbox" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                      Make dish immediately available for orders
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                      className="action-button-secondary"
                      style={{ padding: '8px 16px', borderRadius: '10px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="action-button-primary"
                      style={{ padding: '8px 20px', borderRadius: '10px' }}
                    >
                      {isEditModalOpen ? 'Save Changes' : 'Create Dish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmItem && (
            <div className="modal-backdrop" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 10000,
              padding: '1rem'
            }}>
              <div style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--line-color)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '420px',
                padding: '1.75rem',
                textAlign: 'center'
              }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'grid', placeItems: 'center', margin: '0 auto 1rem auto' }}>
                  <Trash2 size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Dish Removal</h3>
                <p style={{ color: 'var(--muted-color)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Are you sure you want to permanently delete <strong>"{deleteConfirmItem.name}"</strong>? This will remove it from all customer menus.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setDeleteConfirmItem(null)}
                    className="action-button-secondary"
                    style={{ padding: '8px 16px', borderRadius: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteItem}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Delete Dish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE OPERATIONS MONITOR                                            */}
      {/* ========================================================================= */}
      {activeTab === 'live-orders' && (
        <div className="tab-content-live">
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--line-color)',
            marginBottom: '1.5rem'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color)' }} />
              <input
                type="text"
                placeholder="Search by order ID, table # or customer..."
                value={liveSearch}
                onChange={e => setLiveSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid var(--line-color)',
                  background: 'rgba(0,0,0,0.15)',
                  color: 'inherit',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>Status:</span>
              <select
                value={liveFilterStatus}
                onChange={e => setLiveFilterStatus(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-color)',
                  background: 'var(--surface-color)',
                  color: 'inherit',
                  fontSize: '0.82rem'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Order Type Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>Type:</span>
              <select
                value={liveFilterType}
                onChange={e => setLiveFilterType(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-color)',
                  background: 'var(--surface-color)',
                  color: 'inherit',
                  fontSize: '0.82rem'
                }}
              >
                <option value="All">All Types</option>
                <option value="dine-in">Dine-In Only</option>
                <option value="delivery">Delivery Only</option>
              </select>
            </div>
          </div>

          {/* Live Orders Table */}
          {liveLoading && liveOrders.length === 0 ? (
            <div className="loading-center">Connecting to live orders stream...</div>
          ) : filteredLiveOrders.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)'
            }}>
              <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '1rem' }} />
              <h3>No matching live orders</h3>
              <p style={{ color: 'var(--muted-color)', fontSize: '0.9rem' }}>All active kitchen & delivery queues are currently clear.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Order ID</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Type & Dest</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Customer</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Items</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Amount</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiveOrders.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid var(--line-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)' }}>
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          color: order.orderType === 'dine-in' ? '#3b82f6' : '#f59e0b'
                        }}>
                          {order.orderType === 'dine-in' ? `Table ${order.tableNumber || '-'}` : 'Delivery'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.orderType === 'dine-in' ? 'Floor Area' : (order.deliveryAddress || 'Address on file')}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ fontSize: '0.88rem' }}>{order.customerId?.name || 'Guest'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)' }}>{order.customerId?.phone || 'No phone'}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.85rem' }}>
                          {order.items?.length || 0} items ({order.items?.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ')}{order.items?.length > 2 ? '...' : ''})
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                        ${order.totalAmount?.toFixed(2)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(order.status)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setInspectOrder(order)}
                            title="Inspect order details"
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              color: 'inherit',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Eye size={14} />
                            <span>Inspect</span>
                          </button>

                          {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              title="Cancel order"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                color: '#ef4444',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inspect Order Modal */}
          {inspectOrder && (
            <div className="modal-backdrop" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 10000,
              padding: '1rem'
            }}>
              <div style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--line-color)',
                borderRadius: '18px',
                width: '100%',
                maxWidth: '560px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                      Order #{inspectOrder._id.slice(-6).toUpperCase()}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted-color)' }}>
                      Placed at {new Date(inspectOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setInspectOrder(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)', textTransform: 'uppercase', fontWeight: 700 }}>Customer</div>
                    <div style={{ fontWeight: 600 }}>{inspectOrder.customerId?.name || 'Guest'}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>{inspectOrder.customerId?.phone || 'No phone'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)', textTransform: 'uppercase', fontWeight: 700 }}>Destination</div>
                    <div style={{ fontWeight: 600 }}>
                      {inspectOrder.orderType === 'dine-in' ? `Table ${inspectOrder.tableNumber}` : 'Delivery Address'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                      {inspectOrder.orderType === 'dine-in' ? 'Dine-In' : inspectOrder.deliveryAddress}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted-color)', marginBottom: '8px' }}>ORDER ITEMS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {inspectOrder.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-color)', fontSize: '0.88rem' }}>
                        <span>
                          <strong>{item.quantity}x</strong> {item.name}
                          {item.specialInstructions && (
                            <small style={{ display: 'block', color: 'var(--muted-color)', fontSize: '0.78rem' }}>
                              Note: {item.specialInstructions}
                            </small>
                          )}
                        </span>
                        <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ borderTop: '1px solid var(--line-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-color)' }}>Subtotal:</span>
                    <span>${inspectOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-color)' }}>Tax (5%):</span>
                    <span>${inspectOrder.taxAmount?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', marginTop: '4px' }}>
                    <span>Total Amount:</span>
                    <span style={{ color: '#10b981' }}>${inspectOrder.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <div>{getStatusBadge(inspectOrder.status)}</div>
                  <button
                    onClick={() => setInspectOrder(null)}
                    className="action-button-secondary"
                    style={{ padding: '8px 16px', borderRadius: '10px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALES & OPERATIONS REPORTS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="tab-content-reports">
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--line-color)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted-color)' }}>Date Range:</span>
              {[
                { label: 'Today', value: 'today' },
                { label: 'This Week', value: 'week' },
                { label: 'This Month', value: 'month' },
                { label: 'Last 30 Days', value: '30-days' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setReportRange(opt.value); fetchReports(opt.value); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: reportRange === opt.value ? 'var(--primary-color)' : 'transparent',
                    color: reportRange === opt.value ? '#fff' : 'var(--muted-color)',
                    borderColor: reportRange === opt.value ? 'var(--primary-color)' : 'var(--line-color)'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleExportCSV}
                className="action-button-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1rem', borderRadius: '10px' }}
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="action-button-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1rem', borderRadius: '10px' }}
              >
                <Printer size={15} />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Report Summary Cards */}
          {reportLoading ? (
            <div className="loading-center">Generating sales report...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', fontWeight: 600 }}>Gross Revenue</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                    ${reportData?.summary?.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', fontWeight: 600 }}>Total Orders</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
                    {reportData?.summary?.totalOrders || 0}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', fontWeight: 600 }}>Average Order Value</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#3b82f6' }}>
                    ${reportData?.summary?.avgOrderValue?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', fontWeight: 600 }}>Tax Collected</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#8b5cf6' }}>
                    ${reportData?.summary?.totalTax?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* Daily Sales Table */}
              <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--line-color)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Sales Breakdown by Date</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-color)' }}>
                    {reportData?.dailySales?.length || 0} active sales days recorded
                  </span>
                </div>

                {reportData?.dailySales && reportData.dailySales.length > 0 ? (
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line-color)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Date</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Total Orders</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Dine-In</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Delivery</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Tax ($)</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Total Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.dailySales.map(day => (
                          <tr key={day._id} style={{ borderBottom: '1px solid var(--line-color)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{day._id}</td>
                            <td style={{ padding: '12px 16px' }}>{day.orderCount}</td>
                            <td style={{ padding: '12px 16px' }}>{day.dineInOrders}</td>
                            <td style={{ padding: '12px 16px' }}>{day.deliveryOrders}</td>
                            <td style={{ padding: '12px 16px' }}>${day.taxAmount?.toFixed(2)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                              ${day.totalSales?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-color)' }}>
                    No sales data recorded in the selected date window.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
