import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CustomerOrders from './pages/CustomerOrders';
import KitchenDashboard from './pages/KitchenDashboard';
import WaiterDashboard from './pages/WaiterDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import OrderTracking from './pages/OrderTracking';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-center">Restoring your session...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        maxWidth: '560px',
        margin: '4rem auto',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        background: 'var(--surface-color)',
        borderRadius: '20px',
        border: '1px solid var(--line-color)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <ShieldAlert size={34} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--muted-color)', marginBottom: '1.75rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Your current account role (<strong>{user.role}</strong>) does not have authorization to view this portal.
          Required role(s): <strong>{allowedRoles.join(' or ')}</strong>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <Link to="/" className="action-button-secondary" style={{ padding: '9px 20px', borderRadius: '10px' }}>
            Return Home
          </Link>
          <Link to="/login" className="action-button-primary" style={{ padding: '9px 20px', borderRadius: '10px' }}>
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

// Automatic menu redirect helper for /menu route
const MenuRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/restaurants`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          navigate(`/restaurants/${data[0]._id}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/', { replace: true }));
  }, [navigate]);

  return <div className="loading-center">Loading restaurant menu...</div>;
};

// 404 Page Not Found Component
const NotFound = () => (
  <div style={{ maxWidth: '520px', margin: '5rem auto', textAlign: 'center', padding: '2rem' }}>
    <h1 style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--primary-color)', margin: 0, letterSpacing: '-0.03em' }}>404</h1>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0 1rem 0' }}>Page Not Found</h2>
    <p style={{ color: 'var(--muted-color)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
      The requested portal endpoint does not exist or has been moved.
    </p>
    <Link to="/" className="action-button-primary" style={{ padding: '10px 24px', borderRadius: '10px', textDecoration: 'none' }}>
      Return to Home
    </Link>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <Router>
            <div className="app-container">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/menu" element={<MenuRedirect />} />
                  <Route path="/restaurants/:id" element={<RestaurantMenu />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<RoleRoute><Checkout /></RoleRoute>} />
                  <Route path="/my-orders" element={<RoleRoute><CustomerOrders /></RoleRoute>} />
                  <Route path="/track/:orderId" element={<RoleRoute><OrderTracking /></RoleRoute>} />
                  <Route path="/dashboard" element={<RoleRoute><Dashboard /></RoleRoute>} />

                  {/* Staff & Operations Portals with RoleRoute */}
                  <Route
                    path="/kitchen"
                    element={
                      <RoleRoute allowedRoles={['kitchen', 'manager', 'admin']}>
                        <KitchenDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/waiter"
                    element={
                      <RoleRoute allowedRoles={['waiter', 'manager', 'admin']}>
                        <WaiterDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/delivery"
                    element={
                      <RoleRoute allowedRoles={['delivery', 'manager', 'admin']}>
                        <DeliveryDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/manager"
                    element={
                      <RoleRoute allowedRoles={['manager', 'admin']}>
                        <ManagerDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RoleRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </RoleRoute>
                    }
                  />

                  {/* 404 Catch-All Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
