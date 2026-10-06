import React from 'react';

const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <h2 style={{ marginBottom: '1.5rem' }}>User Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3>Recent Orders</h3>
          <p style={{ color: '#888', marginTop: '1rem' }}>No recent orders to display.</p>
        </div>
        
        <div className="card">
          <h3>Active Tables</h3>
          <p style={{ color: '#888', marginTop: '1rem' }}>Table 4, Table 7, Table 12</p>
        </div>
        
        <div className="card">
          <h3>System Status</h3>
          <p style={{ marginTop: '1rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ecdc4', marginRight: '8px' }}></span>
            All systems operational
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
