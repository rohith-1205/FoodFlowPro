import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import {
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag
} from 'lucide-react';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const KitchenDashboard = () => {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All Active'); // 'All Active', 'Pending', 'Preparing'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API beep for new incoming kitchen orders
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.15); // D6 note
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    } catch (e) {
      // AudioContext may be blocked before first user gesture
    }
  }, [soundEnabled]);

  // Fetch active kitchen orders
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await authFetch('/kitchen/orders');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load kitchen orders');
      }
      const data = await res.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('KDS Fetch Error:', err);
      setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [authFetch]);

  // Initial fetch and auto-refresh interval (every 6s fallback)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Socket.io integration for instant ticket dispatch
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL, { reconnectionAttempts: 5 });
      socket.on('new_order', (newOrder) => {
        playAlertSound();
        fetchOrders(true);
      });
      socket.on('order_status_updated', () => {
        fetchOrders(true);
      });
      socket.on('kitchen_order_updated', () => {
        fetchOrders(true);
      });
    } catch (err) {
      console.warn('Socket connection error in KDS:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchOrders, playAlertSound]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (orderId, targetStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await authFetch(`/kitchen/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');

      // Optimistically update or re-fetch
      if (targetStatus === 'Ready') {
        // Ticket is done from kitchen active queue
        setOrders(prev => prev.filter(o => o._id !== orderId));
      } else {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: targetStatus } : o));
      }
      // Re-fetch to ensure sync with server
      fetchOrders(true);
    } catch (err) {
      alert(`Error updating order: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper: Live elapsed minutes & color coding
  const getElapsedInfo = (createdAt) => {
    const elapsedMs = Math.max(0, currentTime.getTime() - new Date(createdAt).getTime());
    const totalSec = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const formatted = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    let urgency = 'normal'; // <10 min: normal
    if (mins >= 20) {
      urgency = 'urgent'; // >20 min: critical flashing red
    } else if (mins >= 10) {
      urgency = 'moderate'; // 10-20 min: amber
    }

    return { formatted, mins, urgency };
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'Pending') return order.status === 'Pending' || order.status === 'Confirmed';
    if (activeTab === 'Preparing') return order.status === 'Preparing';
    return true; // 'All Active'
  });

  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length;
  const preparingCount = orders.filter(o => o.status === 'Preparing').length;

  return (
    <div className="kds-wrapper">
      {/* KDS Header Bar */}
      <header className="kds-header">
        <div className="kds-header-left">
          <div className="kds-brand">
            <ChefHat size={26} className="kds-brand-icon" />
            <div>
              <h1 className="kds-title">Kitchen Display System (KDS)</h1>
              <p className="kds-subtitle">Live Kitchen Order Management & Expediting</p>
            </div>
          </div>
        </div>

        <div className="kds-header-center">
          <div className="kds-clock">
            <Clock size={18} />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        <div className="kds-header-actions">
          <button
            type="button"
            className="kds-btn-tool"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          <button
            type="button"
            className="kds-btn-tool"
            onClick={() => fetchOrders()}
            title="Refresh active tickets"
          >
            <RotateCw size={18} className={loading ? 'kds-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            className="kds-btn-tool"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Filter Tabs & Quick Metrics */}
      <div className="kds-controls-bar">
        <div className="kds-tabs">
          <button
            type="button"
            className={`kds-tab ${activeTab === 'All Active' ? 'active' : ''}`}
            onClick={() => setActiveTab('All Active')}
          >
            All Active <span className="kds-pill">{orders.length}</span>
          </button>
          <button
            type="button"
            className={`kds-tab ${activeTab === 'Pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('Pending')}
          >
            Pending <span className="kds-pill kds-pill-pending">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`kds-tab ${activeTab === 'Preparing' ? 'active' : ''}`}
            onClick={() => setActiveTab('Preparing')}
          >
            Preparing <span className="kds-pill kds-pill-preparing">{preparingCount}</span>
          </button>
        </div>

        <div className="kds-legend">
          <span className="kds-legend-item"><span className="legend-dot normal"></span> &lt;10m</span>
          <span className="kds-legend-item"><span className="legend-dot moderate"></span> 10-20m</span>
          <span className="kds-legend-item"><span className="legend-dot urgent"></span> &gt;20m (Urgent)</span>
        </div>
      </div>

      {/* Main Grid View */}
      <main className="kds-content">
        {loading && orders.length === 0 ? (
          <div className="kds-empty-state">
            <RotateCw size={36} className="kds-spin" />
            <p>Loading kitchen tickets...</p>
          </div>
        ) : error ? (
          <div className="kds-error-state">
            <AlertTriangle size={36} />
            <p>{error}</p>
            <button type="button" onClick={() => fetchOrders()} className="kds-btn-retry">
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="kds-empty-state">
            <UtensilsCrossed size={48} />
            <h2>All Caught Up!</h2>
            <p>No active orders in this view. Incoming tickets will appear automatically.</p>
          </div>
        ) : (
          <div className="kds-grid">
            {filteredOrders.map((order) => {
              const { formatted: elapsedStr, urgency } = getElapsedInfo(order.createdAt);
              const isPreparing = order.status === 'Preparing';
              const isUpdating = updatingId === order._id;
              const ticketNumber = `#${order._id.toString().slice(-4).toUpperCase()}`;

              return (
                <article
                  key={order._id}
                  className={`kds-card ${isPreparing ? 'status-preparing' : 'status-pending'} urgency-${urgency}`}
                >
                  {/* Card Header */}
                  <div className="kds-card-header">
                    <div className="kds-card-title-group">
                      <span className="kds-ticket-num">{ticketNumber}</span>
                      {order.orderType === 'dine-in' ? (
                        <span className="kds-badge-table">TABLE {order.tableNumber || '?'}</span>
                      ) : (
                        <span className="kds-badge-delivery">
                          <ShoppingBag size={13} /> DELIVERY
                        </span>
                      )}
                    </div>

                    <div className={`kds-timer-chip urgency-${urgency}`}>
                      <Clock size={13} />
                      <span>{elapsedStr}</span>
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="kds-card-meta">
                    <span className="kds-order-type">
                      {order.orderType === 'dine-in' ? '🍽️ Dine-in Service' : '🛵 Home Delivery'}
                    </span>
                    <span className={`kds-status-badge ${order.status.toLowerCase()}`}>
                      {order.status === 'Preparing' ? '🔥 In Prep' : '⏳ Pending'}
                    </span>
                  </div>

                  {/* Order-level special instructions */}
                  {order.specialInstructions && (
                    <div className="kds-instruction-box">
                      <AlertTriangle size={15} />
                      <strong>Order Note:</strong> {order.specialInstructions}
                    </div>
                  )}

                  {/* Items list with prominent quantities */}
                  <div className="kds-items-list">
                    {order.items && order.items.map((item, idx) => (
                      <div key={idx} className="kds-item-row">
                        <div className="kds-item-primary">
                          <span className="kds-item-qty">{item.quantity}x</span>
                          <span className="kds-item-name">{item.name}</span>
                        </div>
                        {item.specialInstructions && (
                          <div className="kds-item-special">
                            <span className="kds-special-tag">Note:</span> {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="kds-card-actions">
                    {order.status !== 'Preparing' ? (
                      <button
                        type="button"
                        className="kds-btn-action kds-btn-start"
                        onClick={() => handleUpdateStatus(order._id, 'Preparing')}
                        disabled={isUpdating}
                      >
                        <Flame size={17} />
                        <span>{isUpdating ? 'Starting...' : 'Start Preparing'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="kds-btn-action kds-btn-ready"
                        onClick={() => handleUpdateStatus(order._id, 'Ready')}
                        disabled={isUpdating}
                      >
                        <CheckCircle2 size={17} />
                        <span>{isUpdating ? 'Completing...' : 'Mark Ready'}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDashboard;
