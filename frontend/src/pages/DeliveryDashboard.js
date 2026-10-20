import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Power,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Default reference coordinates for route simulation (Bangalore Metro area)
const RESTAURANT_COORDS = { lat: 12.9716, lng: 77.5946 }; // MG Road
const CUSTOMER_COORDS = { lat: 12.9865, lng: 77.6180 };   // Indiranagar

const DeliveryDashboard = () => {
  const { authFetch, user } = useAuth();
  const { socket, joinRoom, isConnected, showToast } = useSocket();

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'available'
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0); // 0 to 100%
  const [currentCoords, setCurrentCoords] = useState(RESTAURANT_COORDS);
  const [simulatedSpeed, setSimulatedSpeed] = useState(32); // km/h
  const simulationIntervalRef = useRef(null);

  // Load available deliveries
  const loadAvailableDeliveries = useCallback(async () => {
    try {
      const res = await authFetch('/delivery/available');
      if (res.ok) {
        const data = await res.json();
        setAvailableDeliveries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load available deliveries:', err.message);
    }
  }, [authFetch]);

  // Load active delivery for current partner
  const loadActiveDelivery = useCallback(async () => {
    try {
      const res = await authFetch('/delivery/active');
      if (res.ok) {
        const data = await res.json();
        if (data.active && data.delivery) {
          setActiveDelivery(data.delivery);
          setActiveTab('active');
          if (data.delivery.currentCoordinates?.lat) {
            setCurrentCoords(data.delivery.currentCoordinates);
          }
        } else {
          setActiveDelivery(null);
        }
      }
    } catch (err) {
      console.error('Failed to load active delivery:', err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Initial fetch and room joining
  useEffect(() => {
    loadActiveDelivery();
    loadAvailableDeliveries();
    joinRoom('role_delivery');
  }, [loadActiveDelivery, loadAvailableDeliveries, joinRoom]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const handleReady = (data) => {
      loadAvailableDeliveries();
      showToast({
        title: 'New Delivery Available! 🛵',
        message: 'A fresh order is ready for pickup.',
        type: 'ready',
        soundType: 'delivery'
      });
    };

    const handleStatusUpdate = () => {
      loadAvailableDeliveries();
      loadActiveDelivery();
    };

    socket.on('order:ready_for_delivery', handleReady);
    socket.on('order:status_update', handleStatusUpdate);

    return () => {
      socket.off('order:ready_for_delivery', handleReady);
      socket.off('order:status_update', handleStatusUpdate);
    };
  }, [socket, loadAvailableDeliveries, loadActiveDelivery, showToast]);

  // Accept a delivery order
  const handleAcceptDelivery = async (orderId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await authFetch(`/delivery/accept/${orderId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept delivery');

      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 4500);
      setActiveDelivery(data.delivery);
      setActiveTab('active');
      setSimulationProgress(0);
      loadAvailableDeliveries();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Advance delivery status: 'Picked Up' -> 'Out for Delivery' -> 'Delivered'
  const handleUpdateStatus = async (nextStatus) => {
    if (!activeDelivery) return;
    setActionLoading(true);
    setError('');
    const orderId = activeDelivery.orderId?._id || activeDelivery.orderId;
    try {
      const res = await authFetch(`/delivery/status/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');

      setSuccessMsg(`Status updated: ${nextStatus}! 🚀`);
      setTimeout(() => setSuccessMsg(''), 4500);

      if (nextStatus === 'Delivered') {
        // Stop simulation upon delivery and emit final 100% destination arrival ping
        stopSimulation();
        sendLocationPing(orderId, CUSTOMER_COORDS, 100);
        setActiveDelivery(null);
        setActiveTab('available');
        loadAvailableDeliveries();
      } else {
        setActiveDelivery(data.delivery);
        if (nextStatus === 'Out for Delivery' && !isSimulating) {
          startSimulation(orderId);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to emit live location ping to Socket.IO and backend endpoint
  const sendLocationPing = useCallback(async (orderId, coords, progress) => {
    if (!orderId) return;
    // 1. Instant Socket.IO emission to room
    if (socket) {
      socket.emit('delivery:location_ping', {
        orderId,
        coordinates: coords,
        speed: Math.floor(25 + Math.random() * 15),
        heading: 45,
        simulated: true,
        progress
      });
    }

    // 2. Persist in background database
    try {
      await authFetch(`/delivery/location/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          speed: 32,
          simulated: true
        })
      });
    } catch (e) {
      // Non-blocking
    }
  }, [socket, authFetch]);

  // Start live route simulation
  const startSimulation = (orderIdOverride) => {
    const orderId = orderIdOverride || activeDelivery?.orderId?._id || activeDelivery?.orderId;
    if (!orderId) return;

    setIsSimulating(true);
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

    simulationIntervalRef.current = setInterval(() => {
      setSimulationProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(simulationIntervalRef.current);
          setIsSimulating(false);
          sendLocationPing(orderId, CUSTOMER_COORDS, 100);
          setCurrentCoords(CUSTOMER_COORDS);
          return 100;
        }

        const ratio = next / 100;
        // Interpolate coordinates
        const lat = Number((RESTAURANT_COORDS.lat + (CUSTOMER_COORDS.lat - RESTAURANT_COORDS.lat) * ratio).toFixed(6));
        const lng = Number((RESTAURANT_COORDS.lng + (CUSTOMER_COORDS.lng - RESTAURANT_COORDS.lng) * ratio).toFixed(6));
        const updated = { lat, lng };

        setCurrentCoords(updated);
        setSimulatedSpeed(Math.floor(28 + Math.sin(next) * 8));
        sendLocationPing(orderId, updated, next);
        return next;
      });
    }, 2000);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  };

  const resetSimulation = () => {
    stopSimulation();
    setSimulationProgress(0);
    setCurrentCoords(RESTAURANT_COORDS);
    const orderId = activeDelivery?.orderId?._id || activeDelivery?.orderId;
    if (orderId) {
      sendLocationPing(orderId, RESTAURANT_COORDS, 0);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  const orderObj = activeDelivery?.orderId;

  return (
    <div className="delivery-portal-layout">
      {/* Top Bar with Online/Offline Switch & Driver Identity */}
      <header className="delivery-topbar">
        <div className="driver-profile-chip">
          <div className="driver-avatar">
            <span role="img" aria-label="rider">🛵</span>
          </div>
          <div>
            <h2 className="driver-name">{user?.name || 'Partner Rider'}</h2>
            <div className="driver-status-row">
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              <span className="driver-status-label">{isOnline ? 'Live & Accepting Orders' : 'Offline'}</span>
              <span className="socket-indicator" title={isConnected ? 'Socket Connected' : 'Reconnecting...'}>
                {isConnected ? '⚡ Real-time connected' : '⏳ Syncing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="online-toggle-container">
          <span className="toggle-label">{isOnline ? 'Active Online' : 'Paused Offline'}</span>
          <button
            type="button"
            className={`toggle-switch ${isOnline ? 'active' : ''}`}
            onClick={() => setIsOnline(!isOnline)}
            aria-label="Toggle Online Availability"
          >
            <div className="toggle-thumb">
              <Power size={14} />
            </div>
          </button>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <AlertCircle size={20} />
          <span>You are currently <strong>Offline</strong>. Turn on availability above to receive delivery orders.</span>
        </div>
      )}

      {/* Feedback Messages */}
      {error && <div className="alert alert-error" style={{ margin: '1rem 0' }}>{error}</div>}
      {successMsg && <div className="alert alert-success" style={{ margin: '1rem 0' }}>{successMsg}</div>}

      {/* Dashboard Tabs */}
      <nav className="delivery-tabs-nav" aria-label="Delivery Sections">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <span>🎯 Active Delivery</span>
          {activeDelivery && <span className="tab-badge pulse">1</span>}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          <span>📋 Available Orders</span>
          {availableDeliveries.length > 0 && (
            <span className="tab-badge">{availableDeliveries.length}</span>
          )}
        </button>
      </nav>

      {loading ? (
        <div className="loading-center">Loading delivery portal data...</div>
      ) : (
        <div className="delivery-main-content">
          {/* TAB 1: ACTIVE DELIVERY VIEW */}
          {activeTab === 'active' && (
            <div>
              {activeDelivery ? (
                <div className="active-delivery-card">
                  {/* Status Progression Bar */}
                  <div className="delivery-stepper-header">
                    <div className="stepper-meta">
                      <span className="eyebrow" style={{ color: 'var(--secondary-color)', fontWeight: 800 }}>
                        ACTIVE DISPATCH #{String(orderObj?._id || '').slice(-6).toUpperCase()}
                      </span>
                      <h3>Delivery in Progress</h3>
                    </div>
                    <span className={`status-pill status-${(activeDelivery.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {activeDelivery.status}
                    </span>
                  </div>

                  {/* Stage Progress Tracker */}
                  <div className="delivery-stage-bar">
                    {[
                      { key: 'Assigned', label: '1. Assigned' },
                      { key: 'Picked Up', label: '2. Picked Up' },
                      { key: 'Out for Delivery', label: '3. Out for Delivery' },
                      { key: 'Delivered', label: '4. Delivered' }
                    ].map((step, idx) => {
                      const stages = ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];
                      const currentIdx = stages.indexOf(activeDelivery.status);
                      const isComplete = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;
                      return (
                        <div
                          key={step.key}
                          className={`stage-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <div className="step-circle">
                            {isComplete && !isCurrent ? <CheckCircle size={14} /> : idx + 1}
                          </div>
                          <span className="step-label">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Two Column Delivery Details: Pickup vs Dropoff */}
                  <div className="route-cards-grid">
                    {/* Pickup Address Card */}
                    <div className="location-card pickup-card">
                      <div className="loc-card-header">
                        <span className="loc-icon-bubble pickup"><ShoppingBag size={18} /></span>
                        <div>
                          <strong>PICKUP LOCATION</strong>
                          <p className="loc-name">{orderObj?.restaurantId?.name || 'Restaurant Kitchen'}</p>
                        </div>
                      </div>
                      <p className="loc-address">
                        <MapPin size={15} style={{ display: 'inline', marginRight: '4px', color: 'var(--muted-color)' }} />
                        {activeDelivery.pickupAddress || orderObj?.restaurantId?.address || 'Restaurant address'}
                      </p>
                      {activeDelivery.status === 'Assigned' && (
                        <span className="action-hint">👉 Proceed to restaurant to collect the order ticket.</span>
                      )}
                    </div>

                    {/* Drop-off Address Card */}
                    <div className="location-card dropoff-card">
                      <div className="loc-card-header">
                        <span className="loc-icon-bubble dropoff"><Navigation size={18} /></span>
                        <div>
                          <strong>CUSTOMER DROP-OFF</strong>
                          <p className="loc-name">{orderObj?.customerId?.name || 'Valued Customer'}</p>
                        </div>
                      </div>
                      <p className="loc-address">
                        <MapPin size={15} style={{ display: 'inline', marginRight: '4px', color: 'var(--primary-color)' }} />
                        {activeDelivery.deliveryAddress || orderObj?.deliveryAddress || 'Customer delivery address'}
                      </p>
                      <div className="customer-contact-action">
                        {activeDelivery.customerPhone || orderObj?.customerId?.phone ? (
                          <a
                            href={`tel:${activeDelivery.customerPhone || orderObj?.customerId?.phone}`}
                            className="btn-call-customer"
                          >
                            <Phone size={15} />
                            <span>Call Customer ({activeDelivery.customerPhone || orderObj?.customerId?.phone})</span>
                          </a>
                        ) : (
                          <span className="no-phone">Phone not provided</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items & Payment Info */}
                  <div className="order-items-snippet">
                    <div className="snippet-header">
                      <strong>Order Contents ({orderObj?.items?.length || 0} items)</strong>
                      <span className="snippet-total">
                        Total: ₹{Number(orderObj?.totalAmount || 0).toFixed(2)} ({orderObj?.paymentMethod} · {orderObj?.paymentStatus})
                      </span>
                    </div>
                    <div className="snippet-item-list">
                      {orderObj?.items?.map((it, idx) => (
                        <span key={idx} className="snippet-item-badge">
                          {it.quantity}× {it.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stage Action Buttons Progression */}
                  <div className="stage-actions-tray">
                    {activeDelivery.status === 'Assigned' && (
                      <button
                        type="button"
                        className="btn-delivery-action pickup-btn"
                        onClick={() => handleUpdateStatus('Picked Up')}
                        disabled={actionLoading}
                      >
                        <ShoppingBag size={18} />
                        <span>{actionLoading ? 'Updating...' : 'Confirm Order Pickup from Kitchen'}</span>
                        <ArrowRight size={18} />
                      </button>
                    )}

                    {activeDelivery.status === 'Picked Up' && (
                      <button
                        type="button"
                        className="btn-delivery-action dispatch-btn"
                        onClick={() => handleUpdateStatus('Out for Delivery')}
                        disabled={actionLoading}
                      >
                        <Navigation size={18} />
                        <span>{actionLoading ? 'Updating...' : 'Start Delivery • Out for Delivery'}</span>
                        <ArrowRight size={18} />
                      </button>
                    )}

                    {activeDelivery.status === 'Out for Delivery' && (
                      <button
                        type="button"
                        className="btn-delivery-action complete-btn"
                        onClick={() => handleUpdateStatus('Delivered')}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 size={18} />
                        <span>{actionLoading ? 'Marking Delivered...' : 'Mark as Delivered to Customer'}</span>
                        <ShieldCheck size={18} />
                      </button>
                    )}
                  </div>

                  {/* GPS Route Simulation Controller */}
                  <div className="gps-simulation-panel">
                    <div className="sim-panel-header">
                      <div className="sim-title">
                        <Compass className={isSimulating ? 'spinning-compass' : ''} size={22} />
                        <div>
                          <strong>Live GPS Telemetry Simulation</strong>
                          <p>Emits advancing coordinate pings so the customer tracking screen animates in real-time.</p>
                        </div>
                      </div>

                      <div className="sim-buttons">
                        {!isSimulating ? (
                          <button
                            type="button"
                            className="btn btn-simulate-start"
                            onClick={() => startSimulation()}
                          >
                            <Play size={16} />
                            <span>Simulate Live GPS Route</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-simulate-pause"
                            onClick={stopSimulation}
                          >
                            <Pause size={16} />
                            <span>Pause Simulation</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-simulate-reset"
                          onClick={resetSimulation}
                          title="Reset to Restaurant Coordinates"
                        >
                          <RotateCcw size={15} />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Telemetry */}
                    <div className="sim-progress-track">
                      <div
                        className="sim-progress-fill"
                        style={{ width: `${simulationProgress}%` }}
                      />
                      <span className="sim-vehicle-icon" style={{ left: `calc(${simulationProgress}% - 14px)` }}>
                        🛵
                      </span>
                    </div>

                    <div className="telemetry-stats-row">
                      <div className="stat-pill">
                        <small>Simulated Latitude</small>
                        <strong>{currentCoords.lat.toFixed(5)}° N</strong>
                      </div>
                      <div className="stat-pill">
                        <small>Simulated Longitude</small>
                        <strong>{currentCoords.lng.toFixed(5)}° E</strong>
                      </div>
                      <div className="stat-pill">
                        <small>Current Speed</small>
                        <strong>{isSimulating ? `${simulatedSpeed} km/h` : '0 km/h'}</strong>
                      </div>
                      <div className="stat-pill">
                        <small>Trip Progress</small>
                        <strong>{simulationProgress}% Completed</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-active-delivery-card">
                  <div className="empty-delivery-icon">🛵</div>
                  <h3>No Active Delivery Currently Assigned</h3>
                  <p>Check the "Available Orders" tab to claim orders ready from the kitchen.</p>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: '1.25rem' }}
                    onClick={() => setActiveTab('available')}
                  >
                    View Available Orders ({availableDeliveries.length})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AVAILABLE ORDERS LIST */}
          {activeTab === 'available' && (
            <div className="available-orders-section">
              <div className="available-orders-header">
                <div>
                  <h3>Orders Waiting for Pickup</h3>
                  <p>Claim an order to start delivering to customer.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-refresh"
                  onClick={loadAvailableDeliveries}
                >
                  <RefreshCw size={15} />
                  <span>Refresh</span>
                </button>
              </div>

              {availableDeliveries.length === 0 ? (
                <div className="no-available-card">
                  <div className="radar-search-pulse">
                    <span className="pulse-ring" />
                    <span className="pulse-ring delay" />
                    <Compass size={36} color="var(--secondary-color)" />
                  </div>
                  <h3>Scanning for New Orders...</h3>
                  <p>When the kitchen marks an order as "Preparing" or "Ready", it will instantly appear here.</p>
                </div>
              ) : (
                <div className="available-orders-grid">
                  {availableDeliveries.map((delivery) => {
                    const ord = delivery.orderId;
                    if (!ord) return null;
                    const itemsCount = ord.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
                    return (
                      <div key={delivery._id} className="available-order-card">
                        <div className="card-top-row">
                          <span className="order-ticket-id">#{String(ord._id).slice(-5).toUpperCase()}</span>
                          <span className={`status-pill status-${ord.status.toLowerCase()}`}>
                            {ord.status}
                          </span>
                        </div>

                        <div className="restaurant-pickup-info">
                          <strong>{ord.restaurantId?.name || 'Restaurant'}</strong>
                          <p className="pickup-sub">
                            <MapPin size={13} style={{ display: 'inline', marginRight: '3px' }} />
                            {delivery.pickupAddress || ord.restaurantId?.address || 'Restaurant address'}
                          </p>
                        </div>

                        <div className="customer-dropoff-info">
                          <span className="drop-label">Deliver to:</span>
                          <p className="drop-address">
                            <Navigation size={13} style={{ display: 'inline', marginRight: '3px', color: 'var(--primary-color)' }} />
                            {delivery.deliveryAddress || ord.deliveryAddress || 'Customer drop address'}
                          </p>
                        </div>

                        <div className="order-summary-tags">
                          <span className="tag">📦 {itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                          <span className="tag">💵 ₹{ord.totalAmount?.toFixed(2)} ({ord.paymentMethod})</span>
                          <span className="tag fee">⚡ Delivery Fee: ₹45.00</span>
                        </div>

                        <button
                          type="button"
                          className="btn-accept-delivery"
                          onClick={() => handleAcceptDelivery(ord._id)}
                          disabled={actionLoading || !isOnline}
                        >
                          <CheckCircle size={16} />
                          <span>{actionLoading ? 'Assigning...' : 'Accept Delivery Request'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
