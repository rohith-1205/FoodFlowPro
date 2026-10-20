import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Store,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  X,
  Check,
  Star,
  Clock,
  Server,
  Database,
  Radio,
  Sliders,
  Filter,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { authFetch, user: currentAdmin } = useAuth();

  // Active section tab: overview, restaurants, users, disputes
  const [activeTab, setActiveTab] = useState('overview');

  // Notification Toast Helper
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ----------------------------------------------------
  // SECTION 1: PLATFORM STATS & HEALTH
  // ----------------------------------------------------
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await authFetch('/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [authFetch]);

  // ----------------------------------------------------
  // SECTION 2: RESTAURANT MANAGEMENT
  // ----------------------------------------------------
  const [restaurants, setRestaurants] = useState([]);
  const [restLoading, setRestLoading] = useState(false);
  const [restSearch, setRestSearch] = useState('');
  const [isAddRestOpen, setIsAddRestOpen] = useState(false);
  const [editingRest, setEditingRest] = useState(null);
  const [restFormData, setRestFormData] = useState({
    name: '',
    address: '',
    cuisine: '',
    rating: 4.5,
    deliveryTime: '30-45 min',
    image: '',
    isOpen: true
  });
  const [restFormError, setRestFormError] = useState('');

  const fetchRestaurants = useCallback(async () => {
    try {
      setRestLoading(true);
      const res = await authFetch('/admin/restaurants');
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setRestLoading(false);
    }
  }, [authFetch]);

  const handleToggleRestStatus = async (restaurant) => {
    try {
      // Optimistic update
      setRestaurants(prev =>
        prev.map(r => (r._id === restaurant._id ? { ...r, isOpen: !r.isOpen } : r))
      );
      const res = await authFetch(`/admin/restaurants/${restaurant._id}/toggle`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Toggle failed');
      const data = await res.json();
      showToast(data.message || 'Restaurant operational status updated');
      fetchStats();
    } catch (err) {
      setRestaurants(prev =>
        prev.map(r => (r._id === restaurant._id ? { ...r, isOpen: restaurant.isOpen } : r))
      );
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    setRestFormError('');

    if (!restFormData.name.trim() || !restFormData.address.trim() || !restFormData.cuisine.trim()) {
      setRestFormError('Name, Address, and Cuisine are required fields');
      return;
    }

    try {
      if (editingRest) {
        const res = await authFetch(`/admin/restaurants/${editingRest._id}`, {
          method: 'PUT',
          body: JSON.stringify(restFormData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to update restaurant');
        }
        const updated = await res.json();
        setRestaurants(prev => prev.map(r => r._id === updated._id ? { ...r, ...updated } : r));
        setEditingRest(null);
        showToast(`Updated "${updated.name}"`);
      } else {
        const res = await authFetch('/admin/restaurants', {
          method: 'POST',
          body: JSON.stringify(restFormData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to onboard restaurant');
        }
        const created = await res.json();
        setRestaurants(prev => [created, ...prev]);
        setIsAddRestOpen(false);
        showToast(`Onboarded "${created.name}" successfully!`);
        fetchStats();
      }
    } catch (err) {
      setRestFormError(err.message);
    }
  };

  // ----------------------------------------------------
  // SECTION 3: USER MANAGEMENT & ROLE SWITCHER
  // ----------------------------------------------------
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userSearch, setUserSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await authFetch('/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [authFetch]);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const res = await authFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update role');
      }
      setUsers(prev =>
        prev.map(u => (u._id === userId ? { ...u, role: newRole } : u))
      );
      showToast(`User role updated to "${newRole}"`);
      fetchStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // SECTION 4: DISPUTES & COMPLAINTS MODERATION
  // ----------------------------------------------------
  const [disputesData, setDisputesData] = useState({ disputes: [], cancelledOrders: [], reviews: [] });
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputeFilterStatus, setDisputeFilterStatus] = useState('All');
  const [resolvingDispute, setResolvingDispute] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('Resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionRefund, setResolutionRefund] = useState('');

  const fetchDisputes = useCallback(async () => {
    try {
      setDisputesLoading(true);
      const res = await authFetch('/admin/disputes');
      if (res.ok) {
        const data = await res.json();
        setDisputesData(data);
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
    } finally {
      setDisputesLoading(false);
    }
  }, [authFetch]);

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!resolvingDispute) return;

    try {
      const res = await authFetch(`/admin/disputes/${resolvingDispute._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionNotes,
          refundAmount: resolutionRefund ? parseFloat(resolutionRefund) : 0
        })
      });
      if (!res.ok) throw new Error('Failed to resolve dispute');
      const updated = await res.json();
      setDisputesData(prev => ({
        ...prev,
        disputes: prev.disputes.map(d => d._id === resolvingDispute._id ? updated.dispute : d)
      }));
      showToast(`Dispute #${resolvingDispute._id.slice(-6).toUpperCase()} marked as ${resolutionStatus}`);
      setResolvingDispute(null);
      fetchStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to moderate and remove this review?')) return;
    try {
      const res = await authFetch(`/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove review');
      setDisputesData(prev => ({
        ...prev,
        reviews: prev.reviews.filter(r => r._id !== reviewId)
      }));
      showToast('Review removed from platform');
    } catch (err) {
      showToast('Failed to delete review', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchRestaurants();
    fetchUsers();
    fetchDisputes();
  }, [fetchStats, fetchRestaurants, fetchUsers, fetchDisputes]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = userRoleFilter === 'All' || u.role === userRoleFilter.toLowerCase();
      const term = userSearch.toLowerCase();
      const matchSearch = !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.phone && u.phone.includes(term));
      return matchRole && matchSearch;
    });
  }, [users, userRoleFilter, userSearch]);

  // Filtered Restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const term = restSearch.toLowerCase();
      return !term || r.name.toLowerCase().includes(term) || r.cuisine.toLowerCase().includes(term) || r.address.toLowerCase().includes(term);
    });
  }, [restaurants, restSearch]);

  // Filtered Disputes
  const filteredDisputes = useMemo(() => {
    return disputesData.disputes.filter(d => {
      return disputeFilterStatus === 'All' || d.status === disputeFilterStatus;
    });
  }, [disputesData.disputes, disputeFilterStatus]);

  return (
    <div className="admin-dashboard-page" style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.75rem 1.25rem' }}>
      {/* Toast Alert */}
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

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Administrator Console
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6'
            }}>
              <ShieldAlert size={14} />
              Platform Superuser
            </span>
          </div>
          <p style={{ color: 'var(--muted-color)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
            Cross-restaurant governance, user role authorizations, dispute resolution & real-time platform telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => { fetchStats(); fetchRestaurants(); fetchUsers(); fetchDisputes(); }}
            className="action-button-secondary"
            title="Refresh system state"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1rem', borderRadius: '10px' }}
          >
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          {activeTab === 'restaurants' && (
            <button
              onClick={() => {
                setRestFormData({ name: '', address: '', cuisine: '', rating: 4.5, deliveryTime: '30-45 min', image: '', isOpen: true });
                setRestFormError('');
                setIsAddRestOpen(true);
              }}
              className="action-button-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.15rem', borderRadius: '10px' }}
            >
              <Plus size={17} />
              <span>Onboard Partner</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="manager-tabs-bar" style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--line-color)',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'overview' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'overview' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <Activity size={18} />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('restaurants')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'restaurants' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'restaurants' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <Store size={18} />
          <span>Restaurant Partners ({restaurants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'users' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <Users size={18} />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: activeTab === 'disputes' ? 'var(--primary-color)' : 'var(--muted-color)', borderBottom: activeTab === 'disputes' ? '3px solid var(--primary-color)' : '3px solid transparent' }}
        >
          <AlertTriangle size={18} />
          <span>Complaints & Disputes ({disputesData.disputes.filter(d => d.status === 'Open').length} Open)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PLATFORM OVERVIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="tab-admin-overview">
          {statsLoading && !statsData ? (
            <div className="loading-center">Loading platform telemetry...</div>
          ) : (
            <>
              {/* Primary KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Total Restaurants</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#f59e0b' }}>
                        {statsData?.overview?.totalRestaurants || 0}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
                      <Store size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>{statsData?.overview?.openRestaurants || 0} actively taking orders</span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Registered Customers</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#3b82f6' }}>
                        {statsData?.overview?.registeredCustomers || 0}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                      <Users size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>{statsData?.overview?.totalUsers || 0} total platform accounts</span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Active Staff</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#10b981' }}>
                        {statsData?.overview?.activeStaffMembers || 0}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
                      <Sliders size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>Waiters, Kitchen, Delivery & Managers</span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-color)', padding: '1.35rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-color)', letterSpacing: '0.05em' }}>Platform Volume (GMV)</span>
                      <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: '0.35rem', color: '#8b5cf6' }}>
                        ${statsData?.overview?.totalPlatformVolume?.toFixed(2) || '0.00'}
                      </h2>
                    </div>
                    <span style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '10px', borderRadius: '12px' }}>
                      <DollarSign size={24} />
                    </span>
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    <span>{statsData?.overview?.totalOrders || 0} total platform orders processed</span>
                  </div>
                </div>
              </div>

              {/* Staff Breakdown Grid & System Health */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {/* Staff Distribution */}
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Platform Staff Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { role: 'Waiters (Floor Service)', count: statsData?.staffBreakdown?.waiters || 0, color: '#3b82f6' },
                      { role: 'Kitchen Operators (KDS)', count: statsData?.staffBreakdown?.kitchenStaff || 0, color: '#f59e0b' },
                      { role: 'Delivery Partners (Fleet)', count: statsData?.staffBreakdown?.deliveryBoys || 0, color: '#10b981' },
                      { role: 'Restaurant Managers', count: statsData?.staffBreakdown?.managers || 0, color: '#8b5cf6' },
                      { role: 'Platform Administrators', count: statsData?.staffBreakdown?.administrators || 0, color: '#ec4899' }
                    ].map(item => (
                      <div key={item.role} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid var(--line-color)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.role}</span>
                        </div>
                        <strong style={{ fontSize: '1rem' }}>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure & System Telemetry */}
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--line-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>System Infrastructure</h3>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#10b981',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '3px 8px',
                      borderRadius: '12px'
                    }}>
                      All Systems Optimal
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line-color)' }}>
                      <span style={{ color: 'var(--muted-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Database size={15} /> Database Cluster:
                      </span>
                      <strong style={{ color: '#10b981' }}>{statsData?.systemHealth?.databaseStatus || 'Connected (Mongoose)'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line-color)' }}>
                      <span style={{ color: 'var(--muted-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={15} /> Socket.IO Engine:
                      </span>
                      <strong style={{ color: '#10b981' }}>{statsData?.systemHealth?.socketEngine || 'Online'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line-color)' }}>
                      <span style={{ color: 'var(--muted-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} /> Server Uptime:
                      </span>
                      <strong>{Math.floor((statsData?.systemHealth?.uptimeSeconds || 3600) / 60)} minutes</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line-color)' }}>
                      <span style={{ color: 'var(--muted-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Server size={15} /> Memory Allocation:
                      </span>
                      <strong>{statsData?.systemHealth?.memoryUsageMB || 64} MB Heap</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={15} /> API Response Latency:
                      </span>
                      <strong style={{ color: '#10b981' }}>~{statsData?.systemHealth?.apiLatencyMs || 18} ms</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: RESTAURANT MANAGEMENT                                          */}
      {/* ========================================================================= */}
      {activeTab === 'restaurants' && (
        <div className="tab-admin-restaurants">
          {/* Search bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--line-color)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color)' }} />
              <input
                type="text"
                placeholder="Search restaurants by name or cuisine..."
                value={restSearch}
                onChange={e => setRestSearch(e.target.value)}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--muted-color)' }}>
              Showing {filteredRestaurants.length} of {restaurants.length} partner accounts
            </span>
          </div>

          {/* Restaurant Grid / Table */}
          {restLoading && restaurants.length === 0 ? (
            <div className="loading-center">Loading partner accounts...</div>
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
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Restaurant</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Cuisine</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Rating</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Orders & GMV</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map(rest => (
                    <tr key={rest._id} style={{ borderBottom: '1px solid var(--line-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={rest.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120'}
                            alt={rest.name}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120'; }}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.95rem' }}>{rest.name}</strong>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted-color)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {rest.address}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', fontWeight: 600 }}>
                          {rest.cuisine}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#f59e0b' }}>
                          <Star size={15} fill="#f59e0b" /> {rest.rating?.toFixed(1) || '4.5'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div><strong>{rest.orderCount || 0} orders</strong></div>
                        <small style={{ color: '#10b981', fontWeight: 600 }}>${(rest.totalRevenue || 0).toFixed(2)}</small>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleRestStatus(rest)}
                          title="Click to toggle Open / Closed"
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
                            background: rest.isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: rest.isOpen ? '#10b981' : '#ef4444'
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: rest.isOpen ? '#10b981' : '#ef4444' }} />
                          {rest.isOpen ? 'Open (Live)' : 'Closed'}
                        </button>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setEditingRest(rest);
                            setRestFormData({
                              name: rest.name,
                              address: rest.address,
                              cuisine: rest.cuisine,
                              rating: rest.rating || 4.5,
                              deliveryTime: rest.deliveryTime || '30-45 min',
                              image: rest.image || '',
                              isOpen: rest.isOpen
                            });
                            setRestFormError('');
                          }}
                          className="action-button-secondary"
                          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add / Edit Restaurant Partner Modal */}
          {(isAddRestOpen || editingRest) && (
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
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                    {editingRest ? 'Edit Restaurant Partner' : 'Onboard New Restaurant Partner'}
                  </h3>
                  <button
                    onClick={() => { setIsAddRestOpen(false); setEditingRest(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {restFormError && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    marginBottom: '1rem'
                  }}>
                    {restFormError}
                  </div>
                )}

                <form onSubmit={handleSaveRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Restaurant Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bella Trattoria"
                      value={restFormData.name}
                      onChange={e => setRestFormData({ ...restFormData, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Cuisine *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Italian, Continental"
                        value={restFormData.cuisine}
                        onChange={e => setRestFormData({ ...restFormData, cuisine: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Delivery Estimate</label>
                      <input
                        type="text"
                        placeholder="30-45 min"
                        value={restFormData.deliveryTime}
                        onChange={e => setRestFormData({ ...restFormData, deliveryTime: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 104 Indiranagar 100ft Road, Bangalore"
                      value={restFormData.address}
                      onChange={e => setRestFormData({ ...restFormData, address: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Banner Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={restFormData.image}
                      onChange={e => setRestFormData({ ...restFormData, image: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="restOpenStatus"
                      checked={restFormData.isOpen}
                      onChange={e => setRestFormData({ ...restFormData, isOpen: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="restOpenStatus" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      Mark restaurant partner as Open immediately
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => { setIsAddRestOpen(false); setEditingRest(null); }}
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
                      {editingRest ? 'Save Changes' : 'Onboard Partner'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: USER MANAGEMENT & ROLE SWITCHER                                */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="tab-admin-users">
          {/* Controls filter */}
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
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '340px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color)' }} />
              <input
                type="text"
                placeholder="Search user by name, email, or phone..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
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

            {/* Role Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['All', 'Customer', 'Waiter', 'Kitchen', 'Delivery', 'Manager', 'Admin'].map(r => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: userRoleFilter === r ? 'var(--primary-color)' : 'transparent',
                    color: userRoleFilter === r ? '#fff' : 'var(--muted-color)',
                    borderColor: userRoleFilter === r ? 'var(--primary-color)' : 'var(--line-color)'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          {usersLoading && users.length === 0 ? (
            <div className="loading-center">Loading registered users...</div>
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
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>User</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Email</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Phone</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Joined</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Current Role</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Role Switcher</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--line-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem'
                          }}>
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.92rem' }}>{u.name}</strong>
                            {u._id === currentAdmin?._id && (
                              <small style={{ color: '#3b82f6', marginLeft: '6px', fontWeight: 700 }}>(You)</small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', color: 'var(--muted-color)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted-color)' }}>{u.phone || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted-color)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background:
                            u.role === 'admin' ? 'rgba(236, 72, 153, 0.15)' :
                            u.role === 'manager' ? 'rgba(139, 92, 246, 0.15)' :
                            u.role === 'kitchen' ? 'rgba(245, 158, 11, 0.15)' :
                            u.role === 'delivery' ? 'rgba(16, 185, 129, 0.15)' :
                            u.role === 'waiter' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color:
                            u.role === 'admin' ? '#ec4899' :
                            u.role === 'manager' ? '#8b5cf6' :
                            u.role === 'kitchen' ? '#f59e0b' :
                            u.role === 'delivery' ? '#10b981' :
                            u.role === 'waiter' ? '#3b82f6' : 'inherit'
                        }}>
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--line-color)',
                            background: 'rgba(0,0,0,0.2)',
                            color: 'inherit',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="customer">Customer</option>
                          <option value="waiter">Waiter</option>
                          <option value="kitchen">Kitchen</option>
                          <option value="delivery">Delivery</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: COMPLAINTS, DISPUTES & REVIEW MODERATION                       */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <div className="tab-admin-disputes">
          {/* Status filter bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-color)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--line-color)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted-color)' }}>Dispute Status:</span>
              {['All', 'Open', 'Under Review', 'Resolved', 'Rejected'].map(s => (
                <button
                  key={s}
                  onClick={() => setDisputeFilterStatus(s)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: disputeFilterStatus === s ? 'var(--primary-color)' : 'transparent',
                    color: disputeFilterStatus === s ? '#fff' : 'var(--muted-color)',
                    borderColor: disputeFilterStatus === s ? 'var(--primary-color)' : 'var(--line-color)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <span style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>
              {disputesData.disputes.length} active customer dispute tickets
            </span>
          </div>

          {/* Customer Disputes Table */}
          {disputesLoading && disputesData.disputes.length === 0 ? (
            <div className="loading-center">Loading dispute records...</div>
          ) : filteredDisputes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)',
              marginBottom: '2rem'
            }}>
              <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '1rem' }} />
              <h3>No disputes matching status</h3>
              <p style={{ color: 'var(--muted-color)', fontSize: '0.9rem' }}>All customer requests and complaints have been reviewed.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--line-color)',
              overflow: 'hidden',
              marginBottom: '2rem'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Dispute ID</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Customer</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Issue Type</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Description</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Refund ($)</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-color)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisputes.map(disp => (
                    <tr key={disp._id} style={{ borderBottom: '1px solid var(--line-color)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>
                        #{disp._id.slice(-6).toUpperCase()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <strong>{disp.customerId?.name || 'Customer'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-color)' }}>{disp.customerId?.email}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.08)'
                        }}>
                          {disp.issueType}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.85rem' }}>{disp.description}</div>
                        {disp.resolutionNotes && (
                          <small style={{ color: '#10b981', display: 'block', marginTop: '2px' }}>
                            Resolution: {disp.resolutionNotes}
                          </small>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: disp.refundAmount > 0 ? '#10b981' : 'inherit' }}>
                        ${disp.refundAmount ? disp.refundAmount.toFixed(2) : '0.00'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background:
                            disp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' :
                            disp.status === 'Open' ? 'rgba(239, 68, 68, 0.15)' :
                            disp.status === 'Under Review' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.08)',
                          color:
                            disp.status === 'Resolved' ? '#10b981' :
                            disp.status === 'Open' ? '#ef4444' :
                            disp.status === 'Under Review' ? '#f59e0b' : 'inherit'
                        }}>
                          {disp.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setResolvingDispute(disp);
                            setResolutionStatus(disp.status === 'Open' ? 'Resolved' : disp.status);
                            setResolutionNotes(disp.resolutionNotes || '');
                            setResolutionRefund(disp.refundAmount ? String(disp.refundAmount) : '');
                          }}
                          className="action-button-secondary"
                          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
                        >
                          Resolve / Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Review Moderation Section */}
          <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--line-color)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Review Moderation & Feedback</h3>
                <p style={{ color: 'var(--muted-color)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Moderate customer reviews to prevent spam, offensive language, or fraudulent claims.
                </p>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                {disputesData.reviews?.length || 0} recent reviews
              </span>
            </div>

            {disputesData.reviews && disputesData.reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {disputesData.reviews.map(r => (
                  <div key={r._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '12px',
                    border: '1px solid var(--line-color)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{r.customerId?.name || 'Customer'}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-color)' }}>on {r.restaurantId?.name || 'Restaurant'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700 }}>
                          <Star size={13} fill="#f59e0b" /> {r.rating} / 5
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', margin: '4px 0 0 0', color: 'var(--text-color)' }}>"{r.comment}"</p>
                    </div>

                    <button
                      onClick={() => handleDeleteReview(r._id)}
                      title="Moderate and delete review"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: 'none',
                        color: '#ef4444',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-color)' }}>
                No customer reviews submitted yet.
              </div>
            )}
          </div>

          {/* Resolve Dispute Modal */}
          {resolvingDispute && (
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
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Resolve Dispute #{resolvingDispute._id.slice(-6).toUpperCase()}
                  </h3>
                  <button
                    onClick={() => setResolvingDispute(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                  <div><strong>Customer:</strong> {resolvingDispute.customerId?.name} ({resolvingDispute.customerId?.email})</div>
                  <div style={{ marginTop: '4px' }}><strong>Issue:</strong> {resolvingDispute.issueType}</div>
                  <div style={{ marginTop: '4px', color: 'var(--muted-color)' }}>"{resolvingDispute.description}"</div>
                </div>

                <form onSubmit={handleResolveDispute} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Resolution Status *</label>
                    <select
                      value={resolutionStatus}
                      onChange={e => setResolutionStatus(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Approved Refund Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={resolutionRefund}
                      onChange={e => setResolutionRefund(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Resolution Notes / Communication</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Issued 100% refund to customer card. Restaurant notified of packaging issue."
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line-color)', background: 'rgba(0,0,0,0.2)', color: 'inherit', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setResolvingDispute(null)}
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
                      Update Dispute
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
