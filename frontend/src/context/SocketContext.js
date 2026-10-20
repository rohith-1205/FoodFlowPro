import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);

  // Pleasant Web Audio synthesizer chime (Zero external audio file dependencies!)
  const playChime = useCallback((type = 'notification') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      if (type === 'ready') {
        // Upbeat bright bell: G5 (784Hz) -> C6 (1046Hz)
        osc1.frequency.setValueAtTime(783.99, now);
        osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
        osc2.frequency.setValueAtTime(1174.66, now);
      } else if (type === 'delivery') {
        // Dynamic scooter / transit ping: E5 (659Hz) -> G5 (784Hz)
        osc1.frequency.setValueAtTime(659.25, now);
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
        osc2.frequency.setValueAtTime(987.77, now);
      } else {
        // Soft crystal notification chime: A5 (880Hz) -> D6 (1174Hz)
        osc1.frequency.setValueAtTime(880.00, now);
        osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
        osc2.frequency.setValueAtTime(1318.51, now);
      }

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      // Audio playback might be constrained by autoplay policy before interaction
      console.debug('Audio chime silent:', e.message);
    }
  }, [soundEnabled]);

  const showToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id,
      title: toast.title || 'Notification',
      message: toast.message || '',
      type: toast.type || 'info', // 'success', 'info', 'warning', 'ready'
      icon: toast.icon || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...toast
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 toasts
    playChime(toast.soundType || 'notification');

    // Auto-remove after duration
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 4500);

    return () => clearTimeout(timer);
  }, [playChime]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize socket instance
  useEffect(() => {
    const s = io(SOCKET_URL, {
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to server with ID:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Auto-join role rooms when authenticated user changes
  useEffect(() => {
    if (!socket || !user) return;

    if (user.role) {
      socket.emit('join_role', user.role);
      socket.emit('join_room', `role_${user.role}`);
    }
    if (user.role === 'admin' || user.role === 'manager') {
      socket.emit('join_role', 'manager');
      socket.emit('join_role', 'kitchen');
      socket.emit('join_role', 'waiter');
      socket.emit('join_role', 'delivery');
    }
  }, [socket, user]);

  // Global socket notification listeners
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (order) => {
      if (user && ['kitchen', 'manager', 'admin'].includes(user.role)) {
        showToast({
          title: 'New Order Received! 🍽️',
          message: `Order #${(order._id || '').slice(-4).toUpperCase()} (${order.orderType}) received.`,
          type: 'info',
          soundType: 'notification'
        });
      }
    };

    const handleReadyForDelivery = (data) => {
      if (user && ['delivery', 'manager', 'admin'].includes(user.role)) {
        const orderId = (data?.orderId || data?.order?._id || '').slice(-4).toUpperCase();
        showToast({
          title: 'Order Ready for Delivery! 🛵',
          message: `Order #${orderId} is packed and ready for pickup!`,
          type: 'ready',
          soundType: 'delivery'
        });
      }
    };

    const handleTableReady = (data) => {
      if (user && ['waiter', 'manager', 'admin'].includes(user.role)) {
        showToast({
          title: `Table ${data.tableNumber} Food Ready! 🔔`,
          message: `Chef finished order for Table ${data.tableNumber}. Ready to serve.`,
          type: 'ready',
          soundType: 'ready'
        });
      }
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:ready_for_delivery', handleReadyForDelivery);
    socket.on('table:ready', handleTableReady);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:ready_for_delivery', handleReadyForDelivery);
      socket.off('table:ready', handleTableReady);
    };
  }, [socket, user, showToast]);

  // Helper methods
  const joinRoom = useCallback((room) => {
    if (socket && room) {
      socket.emit('join_room', room);
    }
  }, [socket]);

  const leaveRoom = useCallback((room) => {
    if (socket && room) {
      socket.emit('leave_room', room);
    }
  }, [socket]);

  const joinOrder = useCallback((orderId) => {
    if (socket && orderId) {
      socket.emit('join_order', orderId);
      socket.emit('join_room', `order_${orderId}`);
    }
  }, [socket]);

  const emitEvent = useCallback((event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinRoom,
        leaveRoom,
        joinOrder,
        emitEvent,
        showToast,
        playChime,
        soundEnabled,
        setSoundEnabled
      }}
    >
      {children}
      {/* Real-Time Live Toast Notification Container */}
      <div className="socket-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`socket-toast toast-${toast.type}`}>
            <div className="toast-glow-bar" />
            <div className="toast-content">
              <div className="toast-header">
                <span className="toast-badge">{toast.timestamp}</span>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss toast"
                >
                  ×
                </button>
              </div>
              <strong className="toast-title">{toast.title}</strong>
              <p className="toast-message">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
