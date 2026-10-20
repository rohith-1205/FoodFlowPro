import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  ChefHat,
  ShoppingBag,
  ArrowLeft,
  Navigation,
  Compass,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const ORDER_STEPS = [
  { key: 'Pending', label: 'Order Placed', desc: 'Received by kitchen', icon: '📝' },
  { key: 'Confirmed', label: 'Confirmed', desc: 'Approved by chef', icon: '👍' },
  { key: 'Preparing', label: 'Preparing', desc: 'Cooking fresh', icon: '🍳' },
  { key: 'Ready', label: 'Ready', desc: 'Packed & waiting', icon: '📦' },
  { key: 'Out for Delivery', label: 'Out for Delivery', desc: 'Rider is on the way', icon: '🛵' },
  { key: 'Delivered', label: 'Delivered', desc: 'Enjoy your meal!', icon: '🎉' }
];

const RESTAURANT_DEFAULT = { lat: 12.9716, lng: 77.5946 };
const CUSTOMER_DEFAULT = { lat: 12.9865, lng: 77.6180 };

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { socket, joinOrder, showToast } = useSocket();

  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live GPS tracking state
  const [currentCoords, setCurrentCoords] = useState(RESTAURANT_DEFAULT);
  const [tripProgress, setTripProgress] = useState(15); // percentage (0 - 100)
  const [speed, setSpeed] = useState(30);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [isLivePingActive, setIsLivePingActive] = useState(false);

  // Fetch initial order and delivery data
  const loadOrderData = useCallback(async () => {
    try {
      const res = await authFetch(`/orders/${orderId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to load order');
      }
      const data = await res.json();
      setOrder(data);

      // Fetch delivery details if delivery order
      if (data.orderType === 'delivery') {
        try {
          const delRes = await authFetch(`/delivery/order/${orderId}`);
          if (delRes.ok) {
            const delData = await delRes.json();
            if (delData) {
              setDelivery(delData);
              if (delData.currentCoordinates?.lat) {
                setCurrentCoords(delData.currentCoordinates);
              }
            }
          }
        } catch (e) {
          console.debug('No separate delivery doc:', e.message);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, orderId]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  // Join order room for real-time tracking updates
  useEffect(() => {
    if (!orderId) return;
    joinOrder(orderId);
  }, [orderId, joinOrder]);

  // Socket listeners for order status updates and live delivery GPS location pings
  useEffect(() => {
    if (!socket || !orderId) return;

    // Handle order status updates
    const handleStatusUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.orderId || payload.order?._id || payload._id;
      if (String(targetId) === String(orderId)) {
        if (payload.order) {
          setOrder((prev) => ({ ...prev, ...payload.order, status: payload.status || payload.order.status }));
        } else if (payload.status) {
          setOrder((prev) => (prev ? { ...prev, status: payload.status } : null));
        }

        if (payload.delivery) {
          setDelivery(payload.delivery);
        }

        showToast({
          title: `Order Update: ${payload.status || 'Updated'} 🔔`,
          message: `Your order status changed to "${payload.status}".`,
          type: 'info',
          soundType: payload.status === 'Ready' ? 'ready' : 'notification'
        });
      }
    };

    // Handle live GPS coordinates ping from delivery rider
    const handleLocationPing = (payload) => {
      if (!payload || String(payload.orderId) !== String(orderId)) return;
      if (payload.coordinates?.lat && payload.coordinates?.lng) {
        setCurrentCoords(payload.coordinates);
        setIsLivePingActive(true);
        setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        if (payload.speed) setSpeed(payload.speed);
        if (payload.progress !== undefined) {
          setTripProgress(Math.min(100, Math.max(0, payload.progress)));
        } else {
          // Estimate progress by latitude distance
          const totalLatDiff = CUSTOMER_DEFAULT.lat - RESTAURANT_DEFAULT.lat;
          const currentLatDiff = payload.coordinates.lat - RESTAURANT_DEFAULT.lat;
          const computed = Math.min(100, Math.max(10, Math.round((currentLatDiff / totalLatDiff) * 100)));
          setTripProgress(computed);
        }
      }
    };

    // Handle delivery assignment
    const handleDeliveryAssigned = (payload) => {
      if (String(payload.orderId) === String(orderId)) {
        if (payload.delivery) setDelivery(payload.delivery);
        showToast({
          title: 'Delivery Partner Assigned! 🛵',
          message: `${payload.deliveryBoy?.name || 'A rider'} has accepted your order.`,
          type: 'ready',
          soundType: 'delivery'
        });
      }
    };

    socket.on('order:status_update', handleStatusUpdate);
    socket.on('delivery:location_ping', handleLocationPing);
    socket.on('delivery:location_update', handleLocationPing);
    socket.on('delivery:assigned', handleDeliveryAssigned);

    return () => {
      socket.off('order:status_update', handleStatusUpdate);
      socket.off('delivery:location_ping', handleLocationPing);
      socket.off('delivery:location_update', handleLocationPing);
      socket.off('delivery:assigned', handleDeliveryAssigned);
    };
  }, [socket, orderId, showToast]);

  // Determine current step index
  const currentStatus = order?.status || 'Pending';
  const currentStepIndex = ORDER_STEPS.findIndex(
    (s) => s.key.toLowerCase() === currentStatus.toLowerCase()
  );
  const activeStepIdx = currentStepIndex >= 0 ? currentStepIndex : 0;

  // Calculate ETA countdown
  const getEtaString = () => {
    if (currentStatus === 'Delivered') return 'Order Delivered!';
    if (currentStatus === 'Out for Delivery') {
      const remainingPct = 100 - tripProgress;
      const mins = Math.max(3, Math.round((remainingPct / 100) * 20));
      return `Estimated Arrival: ~${mins} mins`;
    }
    if (currentStatus === 'Ready') return 'Estimated Arrival: ~20-25 mins';
    if (currentStatus === 'Preparing') return 'Estimated Arrival: ~30-40 mins';
    return 'Estimated Arrival: ~35-45 mins';
  };

  if (loading) {
    return (
      <div className="tracking-page-container">
        <div className="loading-center">
          <div className="radar-search-pulse" style={{ marginBottom: '1rem' }}>
            <Compass size={32} color="var(--primary-color)" />
          </div>
          <p>Connecting to live order tracking channel...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="tracking-page-container">
        <div className="alert alert-error" style={{ maxWidth: '600px', margin: '3rem auto' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Unable to track order</strong>
            <p>{error || 'Order not found'}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/my-orders" className="btn btn-outline">
            ← Return to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const isDelivery = order.orderType === 'delivery';

  return (
    <div className="tracking-page-container">
      {/* Top Navigation & Status Header */}
      <div className="tracking-top-header">
        <button
          type="button"
          className="btn-back-link"
          onClick={() => navigate('/my-orders')}
        >
          <ArrowLeft size={16} />
          <span>My Orders</span>
        </button>

        <div className="tracking-heading-row">
          <div>
            <span className="tracking-eyebrow">REAL-TIME ORDER TRACKER</span>
            <h1 className="tracking-title">
              Order #{String(order._id).slice(-6).toUpperCase()}
            </h1>
            <p className="tracking-sub">
              {order.restaurantId?.name || 'Restaurant'} • Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="live-status-badge-container">
            <span className={`live-status-badge status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
              <span className="live-pulse-dot" />
              {currentStatus}
            </span>
            <span className="eta-badge">{getEtaString()}</span>
          </div>
        </div>
      </div>

      {/* Visual Order Progress Stepper */}
      <div className="progress-stepper-card">
        <div className="stepper-track-line">
          <div
            className="stepper-track-fill"
            style={{ width: `${(activeStepIdx / (ORDER_STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="stepper-nodes-row">
          {ORDER_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIdx;
            const isCurrent = idx === activeStepIdx;
            return (
              <div
                key={step.key}
                className={`stepper-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
              >
                <div className="stepper-icon-bubble">
                  {isCompleted ? <CheckCircle2 size={18} /> : <span>{step.icon}</span>}
                  {isCurrent && <span className="stepper-radar-ring" />}
                </div>
                <strong className="node-label">{step.label}</strong>
                <small className="node-desc">{step.desc}</small>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Interactive Map / Route Simulation + Order Summary */}
      <div className="tracking-grid-layout">
        {/* Left Column: Interactive Map & Live GPS Route */}
        <div className="tracking-map-column">
          <div className="live-map-card">
            <div className="map-card-header">
              <div className="map-title-row">
                <span className="live-radar-dot" />
                <strong>Live Delivery GPS Route</strong>
                {isLivePingActive && (
                  <span className="live-signal-badge">
                    ⚡ Live GPS Feed Active {lastPingTime ? `(${lastPingTime})` : ''}
                  </span>
                )}
              </div>
              <span className="eta-pill">
                <Clock size={14} />
                {currentStatus === 'Delivered' ? 'Delivered' : `Trip ~${tripProgress}% Complete`}
              </span>
            </div>

            {/* Simulated Interactive SVG Map Graphic */}
            <div className="interactive-map-canvas">
              <svg viewBox="0 0 600 320" className="map-svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Subtle Grid Pattern */}
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  </pattern>

                  {/* Road Gradient */}
                  <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2d796c" />
                    <stop offset="50%" stopColor="#e5a92d" />
                    <stop offset="100%" stopColor="#d94f37" />
                  </linearGradient>

                  {/* Pulsing Destination Filter */}
                  <radialGradient id="destPulse">
                    <stop offset="0%" stopColor="rgba(217, 79, 55, 0.4)" />
                    <stop offset="100%" stopColor="rgba(217, 79, 55, 0.0)" />
                  </radialGradient>
                </defs>

                {/* Map Base Canvas */}
                <rect width="600" height="320" rx="16" fill="#182220" />
                <rect width="600" height="320" fill="url(#grid)" />

                {/* City Blocks Decorative Shapes */}
                <rect x="30" y="30" width="80" height="70" rx="6" fill="#202c29" />
                <rect x="130" y="30" width="110" height="50" rx="6" fill="#202c29" />
                <rect x="30" y="120" width="100" height="110" rx="6" fill="#202c29" />
                <rect x="260" y="40" width="140" height="60" rx="6" fill="#202c29" />
                <rect x="420" y="30" width="140" height="90" rx="6" fill="#202c29" />
                <rect x="270" y="190" width="130" height="90" rx="6" fill="#202c29" />
                <rect x="430" y="150" width="130" height="130" rx="6" fill="#202c29" />
                <rect x="150" y="210" width="90" height="70" rx="6" fill="#202c29" />

                {/* Park Zone */}
                <rect x="160" y="100" width="70" height="80" rx="10" fill="#1c3831" />
                <text x="180" y="145" fill="#4fa896" fontSize="12" fontWeight="700">PARK</text>

                {/* Road Path from Restaurant (x=80, y=90) to Customer (x=500, y=230) */}
                <path
                  d="M 80,90 Q 200,80 250,150 T 500,230"
                  fill="none"
                  stroke="#2c3a37"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 80,90 Q 200,80 250,150 T 500,230"
                  fill="none"
                  stroke="url(#roadGrad)"
                  strokeWidth="5"
                  strokeDasharray="6 6"
                  className="animated-dash-line"
                />

                {/* Restaurant Origin Node (x=80, y=90) */}
                <g transform="translate(80, 90)">
                  <circle r="18" fill="#2d796c" />
                  <circle r="24" fill="none" stroke="#2d796c" strokeWidth="1.5" opacity="0.6" />
                  <text x="0" y="5" textAnchor="middle" fontSize="14" fill="#ffffff">🍴</text>
                  <rect x="-50" y="-36" width="100" height="22" rx="4" fill="rgba(0,0,0,0.75)" />
                  <text x="0" y="-22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                    RESTAURANT
                  </text>
                </g>

                {/* Customer Destination Node (x=500, y=230) */}
                <g transform="translate(500, 230)">
                  <circle r="36" fill="url(#destPulse)" className="dest-pulse-anim" />
                  <circle r="18" fill="#d94f37" />
                  <circle r="24" fill="none" stroke="#d94f37" strokeWidth="1.5" opacity="0.6" />
                  <text x="0" y="5" textAnchor="middle" fontSize="14" fill="#ffffff">🏠</text>
                  <rect x="-45" y="-36" width="90" height="22" rx="4" fill="rgba(0,0,0,0.75)" />
                  <text x="0" y="-22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                    YOU (DROP)
                  </text>
                </g>

                {/* Dynamic Delivery Vehicle Marker along Quadratic Curve */}
                {(() => {
                  const t = Math.max(0.05, Math.min(0.95, tripProgress / 100));
                  // Bezier calculation: B(t) for P0=(80,90), P1=(200,80), P2=(250,150), P3=(500,230)
                  // Simplified quadratic interpolation across waypoint
                  const x = 80 + (500 - 80) * t;
                  const y = 90 + (230 - 90) * t - Math.sin(t * Math.PI) * 40;
                  return (
                    <g transform={`translate(${x}, ${y})`} className="vehicle-group">
                      <circle r="22" fill="rgba(229, 169, 45, 0.25)" className="vehicle-halo" />
                      <circle r="14" fill="#e5a92d" />
                      <text x="0" y="4" textAnchor="middle" fontSize="12">🛵</text>
                      <rect x="-35" y="20" width="70" height="18" rx="4" fill="rgba(0,0,0,0.85)" />
                      <text x="0" y="32" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e5a92d">
                        {speed} km/h
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Live Telemetry Bar */}
            <div className="map-telemetry-bar">
              <div className="telemetry-item">
                <span className="telemetry-label">Vehicle Coordinates</span>
                <strong className="telemetry-value">
                  {currentCoords.lat.toFixed(4)}°N, {currentCoords.lng.toFixed(4)}°E
                </strong>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Transit Speed</span>
                <strong className="telemetry-value">{speed} km/h</strong>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Status</span>
                <strong className="telemetry-value" style={{ color: 'var(--secondary-color)' }}>
                  {currentStatus === 'Delivered' ? 'Arrived' : 'En Route'}
                </strong>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Trip Progress</span>
                <strong className="telemetry-value">{tripProgress}%</strong>
              </div>
            </div>

            {/* Delivery Partner Assigned Card */}
            {delivery?.deliveryBoyId && (
              <div className="partner-assigned-card">
                <div className="partner-avatar-circle">
                  <span>🛵</span>
                </div>
                <div className="partner-details">
                  <span className="partner-role-tag">DELIVERY VALET</span>
                  <h4 className="partner-name">{delivery.deliveryBoyId.name || 'FoodFlow Rider'}</h4>
                  <p className="partner-meta">Verified FoodFlow Partner • 4.9 ★ Rating</p>
                </div>
                {delivery.deliveryBoyId.phone && (
                  <a href={`tel:${delivery.deliveryBoyId.phone}`} className="btn-call-partner">
                    <Phone size={15} />
                    <span>Call Valet</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Details Summary */}
        <div className="tracking-summary-column">
          <div className="tracking-summary-card">
            <h3>Order Details</h3>

            {/* Restaurant Info */}
            <div className="summary-restaurant-box">
              <span className="rest-icon">🍴</span>
              <div>
                <strong>{order.restaurantId?.name || 'Selected Restaurant'}</strong>
                <p>{order.restaurantId?.address || 'Restaurant address'}</p>
              </div>
            </div>

            {/* Delivery / Dine-in Destination Info */}
            <div className="summary-dest-box">
              <span className="dest-icon">📍</span>
              <div>
                <strong>{isDelivery ? 'Delivery Address' : `Dine-In (Table ${order.tableNumber})`}</strong>
                <p>{order.deliveryAddress || (order.tableNumber ? `Table #${order.tableNumber}` : 'Restaurant')}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="summary-items-list">
              <span className="items-list-title">ITEMS ORDERED ({order.items?.length || 0})</span>
              {order.items?.map((item, index) => (
                <div key={index} className="tracking-item-row">
                  <div className="item-qty-name">
                    <span className="item-qty-chip">{item.quantity}×</span>
                    <span className="item-name">{item.name}</span>
                  </div>
                  <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Financials & Payment */}
            <div className="tracking-pricing-box">
              <div className="pricing-row">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>Taxes &amp; GST (5%)</span>
                <span>₹{Number(order.taxAmount || 0).toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="pricing-row">
                  <span>Delivery Partner Fee</span>
                  <span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>₹45.00 (Included)</span>
                </div>
              )}
              <div className="pricing-row pricing-total">
                <strong>Grand Total</strong>
                <strong style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                  ₹{Number(order.totalAmount || 0).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Payment Method Badge */}
            <div className="payment-summary-pill">
              <span>Payment Mode:</span>
              <strong>{order.paymentMethod} ({order.paymentStatus || 'Paid'})</strong>
            </div>

            {/* Special Instructions Note */}
            {order.specialInstructions && (
              <div className="special-notes-box">
                <small>Special Instructions:</small>
                <p>"{order.specialInstructions}"</p>
              </div>
            )}

            {/* Actions */}
            <div className="tracking-actions-footer">
              <Link to="/my-orders" className="btn btn-outline btn-full">
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
