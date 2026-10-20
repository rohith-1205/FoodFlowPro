import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Utensils, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const isKitchenStaff = user && ['kitchen', 'manager', 'admin'].includes(user.role);
  const isWaiterStaff = user && ['waiter', 'manager', 'admin'].includes(user.role);

  return (
    <div className="dashboard-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Restaurant Operations Dashboard</h1>
        <p style={{ color: 'var(--muted-color)', marginTop: '0.25rem' }}>
          Welcome back, <strong>{user?.name || 'Staff'}</strong> ({user?.role?.toUpperCase() || 'USER'})
        </p>
      </div>

      {/* Staff Operational Quick-Launch Cards */}
      {(isKitchenStaff || isWaiterStaff) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {isKitchenStaff && (
            <Link
              to="/kitchen"
              style={{
                textDecoration: 'none',
                background: '#141b24',
                color: '#ffffff',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '2px solid #f59e0b',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <span style={{ background: '#f59e0b', color: '#0b0f15', padding: '8px', borderRadius: '10px', display: 'grid' }}>
                    <ChefHat size={24} />
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Kitchen Display System (KDS)</h2>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Live incoming tickets, elapsed timers, order transitions (Start Preparing, Mark Ready).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.92rem' }}>
                <span>Open KDS Screen</span>
                <ArrowRight size={17} />
              </div>
            </Link>
          )}

          {isWaiterStaff && (
            <Link
              to="/waiter"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                color: '#1e3a8a',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '2px solid #3b82f6',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <span style={{ background: '#3b82f6', color: '#ffffff', padding: '8px', borderRadius: '10px', display: 'grid' }}>
                    <Utensils size={24} />
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Waiter Table Management</h2>
                </div>
                <p style={{ color: '#3b82f6', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  10-table visual floor plan grid, ready food alert banner, order taking, and bill settlement.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', color: '#1d4ed8', fontWeight: 700, fontSize: '0.92rem' }}>
                <span>Open Table Service</span>
                <ArrowRight size={17} />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* System Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Restaurant Tables</h3>
          <p style={{ color: 'var(--muted-color)', marginTop: '0.5rem', fontSize: '0.88rem' }}>10 Live Dine-in Tables monitored</p>
        </div>

        <div className="card" style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Kitchen Status</h3>
          <p style={{ color: 'var(--muted-color)', marginTop: '0.5rem', fontSize: '0.88rem' }}>KDS Active & Socket Real-time Listener ready</p>
        </div>

        <div className="card" style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--line-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Status</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '8px' }}></span>
            All systems operational
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
