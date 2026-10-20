import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import {
  Users,
  Utensils,
  Bell,
  CheckCircle,
  Receipt,
  PlusCircle,
  CreditCard,
  Banknote,
  Smartphone,
  RotateCw,
  X,
  Search,
  Check
} from 'lucide-react';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const WaiterDashboard = () => {
  const { authFetch } = useAuth();

  // State
  const [tables, setTables] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Active Selections
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState(null);
  const [billLoading, setBillLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [actionLoading, setActionLoading] = useState(false);

  // New Order Modal State
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderItemsMap, setOrderItemsMap] = useState({}); // itemId -> { menuItem, quantity }
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [menuLoading, setMenuLoading] = useState(false);

  // Fetch tables and ready orders
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [tablesRes, readyRes] = await Promise.all([
        authFetch('/waiter/tables'),
        authFetch('/waiter/ready-orders')
      ]);

      if (tablesRes.ok) {
        const tableData = await tablesRes.json();
        setTables(tableData);
      }
      if (readyRes.ok) {
        const readyData = await readyRes.json();
        setReadyOrders(readyData);
      }
      setError(null);
    } catch (err) {
      console.error('Waiter fetch error:', err);
      setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [authFetch]);

  // Initial load & Polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Socket.io for live notifications
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL, { reconnectionAttempts: 5 });
      socket.on('food_ready', () => {
        fetchData(true);
      });
      socket.on('order_status_updated', () => {
        fetchData(true);
      });
      socket.on('table_updated', () => {
        fetchData(true);
      });
      socket.on('table_settled', () => {
        fetchData(true);
      });
      socket.on('new_order', () => {
        fetchData(true);
      });
    } catch (err) {
      console.warn('Socket connection error in Waiter Dashboard:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData]);

  // Load menu items when opening Order modal
  const loadMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      // Fetch restaurants first
      const res = await fetch(`${API_BASE}/restaurants`);
      if (res.ok) {
        const restaurants = await res.json();
        if (restaurants && restaurants.length > 0) {
          const menuRes = await fetch(`${API_BASE}/restaurants/${restaurants[0]._id}/menu`);
          if (menuRes.ok) {
            const menuJson = await menuRes.json();
            if (menuJson.items && menuJson.items.length > 0) {
              setMenuItems(menuJson.items);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load menu items:', err);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showOrderModal && menuItems.length === 0) {
      loadMenu();
    }
  }, [showOrderModal, menuItems.length, loadMenu]);

  // Keep selected table in sync with table updates
  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find(t => t.tableNumber === selectedTable.tableNumber);
      if (updated) setSelectedTable(updated);
    }
  }, [tables, selectedTable]);

  // Actions
  const handleServeOrder = async (orderId, tableNumber) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/waiter/orders/${orderId}/serve`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to serve order');
      }
      await fetchData(true);
    } catch (err) {
      alert(`Error serving order: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBillModal = async (table) => {
    setBillLoading(true);
    setShowBillModal(true);
    try {
      const res = await authFetch(`/waiter/tables/${table.tableNumber}/bill`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to calculate bill');
      setBillData(data);
      await fetchData(true);
    } catch (err) {
      alert(`Bill Error: ${err.message}`);
      setShowBillModal(false);
    } finally {
      setBillLoading(false);
    }
  };

  const handleSettleTable = async (tableNumber) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/waiter/tables/${tableNumber}/settle`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: selectedPaymentMethod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to settle table');

      setShowBillModal(false);
      setSelectedTable(null);
      await fetchData(true);
    } catch (err) {
      alert(`Settle Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit direct waiter order
  const handleCreateOrder = async () => {
    const selectedItems = Object.values(orderItemsMap).filter(item => item.quantity > 0);
    if (selectedItems.length === 0) {
      alert('Please select at least one item.');
      return;
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        tableNumber: selectedTable.tableNumber,
        specialInstructions,
        items: selectedItems.map(si => ({
          menuItemId: si.menuItem._id,
          name: si.menuItem.name,
          price: si.menuItem.price,
          quantity: si.quantity
        }))
      };

      const res = await authFetch('/waiter/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');

      setShowOrderModal(false);
      setOrderItemsMap({});
      setSpecialInstructions('');
      await fetchData(true);
    } catch (err) {
      alert(`Order submission failed: ${err.message}`);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const updateItemQty = (item, delta) => {
    setOrderItemsMap(prev => {
      const current = prev[item._id]?.quantity || 0;
      const nextQty = Math.max(0, current + delta);
      if (nextQty === 0) {
        const nextState = { ...prev };
        delete nextState[item._id];
        return nextState;
      }
      return {
        ...prev,
        [item._id]: { menuItem: item, quantity: nextQty }
      };
    });
  };

  // Categories for Menu Modal
  const categories = ['All', ...new Set(menuItems.map(i => i.category || 'Mains'))];
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = !searchFilter || item.name.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const orderCartList = Object.values(orderItemsMap);
  const orderSubtotal = orderCartList.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  return (
    <div className="waiter-page-container">
      {/* Page Header */}
      <div className="waiter-top-bar">
        <div>
          <h1 className="waiter-page-title">Waiter Table Service & Floor Plan</h1>
          <p className="waiter-page-subtitle">Real-time table occupancy, food service alerts, and table billing</p>
        </div>
        <div className="waiter-top-actions">
          <button type="button" className="waiter-btn-refresh" onClick={() => fetchData()} disabled={loading}>
            <RotateCw size={17} className={loading ? 'waiter-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* "Ready to Serve" Alert Banner */}
      {readyOrders.length > 0 && (
        <section className="waiter-alert-banner" aria-label="Ready to serve notifications">
          <div className="alert-banner-header">
            <span className="alert-pulse-icon">
              <Bell size={20} />
            </span>
            <div className="alert-banner-text">
              <h3>Food Ready to Serve! ({readyOrders.length} {readyOrders.length === 1 ? 'order' : 'orders'})</h3>
              <p>The kitchen has completed food preparation for the following tables:</p>
            </div>
          </div>

          <div className="alert-orders-scroller">
            {readyOrders.map((ro) => (
              <div key={ro._id} className="alert-order-chip">
                <div className="alert-order-info">
                  <span className="alert-table-badge">Table {ro.tableNumber}</span>
                  <span className="alert-order-items-snippet">
                    {ro.items && ro.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="alert-btn-serve"
                  onClick={() => handleServeOrder(ro._id, ro.tableNumber)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={16} />
                  <span>Serve Now</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Floor Plan Legend */}
      <div className="floor-plan-legend-card">
        <div className="legend-items-row">
          <div className="legend-chip available">
            <span className="status-dot"></span>
            <strong>Green</strong>: Available
          </div>
          <div className="legend-chip occupied">
            <span className="status-dot"></span>
            <strong>Yellow</strong>: Occupied
          </div>
          <div className="legend-chip ready">
            <span className="status-dot"></span>
            <strong>Blue</strong>: Food Ready to Serve
          </div>
          <div className="legend-chip bill-requested">
            <span className="status-dot"></span>
            <strong>Purple</strong>: Bill Requested
          </div>
        </div>
      </div>

      {/* Visual Table Floor Plan Grid (Tables 1 to 10) */}
      <div className="table-floor-grid">
        {tables.map((table) => {
          let colorTheme = 'available';
          if (table.displayStatus === 'Bill Requested') {
            colorTheme = 'bill-requested';
          } else if (table.displayStatus === 'Food Ready to Serve') {
            colorTheme = 'ready';
          } else if (table.displayStatus === 'Occupied') {
            colorTheme = 'occupied';
          }

          const hasActiveOrder = Boolean(table.activeOrder);
          const activeOrderId = table.activeOrderId;
          const isFoodReady = table.foodReady;

          return (
            <div
              key={table.tableNumber}
              className={`table-card status-${colorTheme}`}
              onClick={() => setSelectedTable(table)}
            >
              <div className="table-card-top">
                <span className="table-number-label">Table {table.tableNumber}</span>
                <span className="table-capacity-chip">
                  <Users size={13} /> {table.capacity} Seats
                </span>
              </div>

              <div className="table-status-indicator">
                <span className={`status-pill ${colorTheme}`}>
                  {table.displayStatus}
                </span>
              </div>

              <div className="table-card-body">
                {hasActiveOrder ? (
                  <div className="active-order-summary">
                    <p className="order-items-count">
                      <Utensils size={14} />
                      <span>{table.items ? table.items.reduce((s, i) => s + i.quantity, 0) : 0} items active</span>
                    </p>
                    <p className="order-subtotal">₹{table.activeOrder?.totalAmount || '0.00'}</p>
                  </div>
                ) : (
                  <div className="table-vacant-msg">
                    <span>Vacant & Ready</span>
                  </div>
                )}
              </div>

              {/* Fast action shortcut */}
              <div className="table-card-footer">
                {isFoodReady && activeOrderId && (
                  <button
                    type="button"
                    className="table-btn-quick-serve"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleServeOrder(activeOrderId, table.tableNumber);
                    }}
                  >
                    <CheckCircle size={14} /> Serve Food
                  </button>
                )}
                {!hasActiveOrder && (
                  <button
                    type="button"
                    className="table-btn-quick-order"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTable(table);
                      setShowOrderModal(true);
                    }}
                  >
                    <PlusCircle size={14} /> New Order
                  </button>
                )}
                {hasActiveOrder && !isFoodReady && (
                  <span className="table-card-action-hint">Click to manage</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Detail Modal / Drawer */}
      {selectedTable && !showOrderModal && !showBillModal && (
        <div className="waiter-modal-overlay" onClick={() => setSelectedTable(null)}>
          <div className="waiter-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>Table {selectedTable.tableNumber} Details</h2>
                <span className={`status-pill ${
                  selectedTable.displayStatus === 'Food Ready to Serve' ? 'ready' :
                  selectedTable.displayStatus === 'Bill Requested' ? 'bill-requested' :
                  selectedTable.displayStatus === 'Occupied' ? 'occupied' : 'available'
                }`}>
                  {selectedTable.displayStatus}
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedTable(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="table-overview-bar">
                <span><strong>Capacity:</strong> {selectedTable.capacity} guests</span>
                <span><strong>Active Order:</strong> {selectedTable.activeOrderId ? `#${selectedTable.activeOrderId.toString().slice(-4).toUpperCase()}` : 'None'}</span>
              </div>

              {selectedTable.activeOrder ? (
                <div className="table-order-detail-section">
                  <h3>Ordered Items</h3>
                  <div className="items-table-list">
                    {selectedTable.items && selectedTable.items.length > 0 ? (
                      selectedTable.items.map((item, idx) => (
                        <div key={idx} className="order-detail-row">
                          <div className="item-qty-name">
                            <span className="item-qty-badge">{item.quantity}x</span>
                            <div>
                              <strong className="item-name">{item.name}</strong>
                              {item.specialInstructions && (
                                <p className="item-note">Note: {item.specialInstructions}</p>
                              )}
                            </div>
                          </div>
                          <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-items-text">No items registered.</p>
                    )}
                  </div>

                  <div className="order-financials-summary">
                    <div className="fin-row">
                      <span>Subtotal:</span>
                      <span>₹{Number(selectedTable.activeOrder?.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="fin-row">
                      <span>GST (5%):</span>
                      <span>₹{Number(selectedTable.activeOrder?.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="fin-row total">
                      <span>Current Total:</span>
                      <strong>₹{Number(selectedTable.activeOrder?.totalAmount || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="table-no-order-box">
                  <Utensils size={36} />
                  <p>This table is currently available with no active order.</p>
                </div>
              )}
            </div>

            <div className="modal-actions-bar">
              {selectedTable.foodReady && selectedTable.activeOrderId && (
                <button
                  type="button"
                  className="btn-modal-serve"
                  onClick={() => handleServeOrder(selectedTable.activeOrderId, selectedTable.tableNumber)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={18} />
                  <span>Mark as Served</span>
                </button>
              )}

              <button
                type="button"
                className="btn-modal-new-order"
                onClick={() => setShowOrderModal(true)}
              >
                <PlusCircle size={18} />
                <span>{selectedTable.activeOrder ? 'Add More Items' : 'Take New Order'}</span>
              </button>

              {selectedTable.activeOrder && (
                <button
                  type="button"
                  className="btn-modal-bill"
                  onClick={() => handleOpenBillModal(selectedTable)}
                >
                  <Receipt size={18} />
                  <span>Generate Bill & Settle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill & Settlement Modal */}
      {showBillModal && selectedTable && (
        <div className="waiter-modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="waiter-modal-card bill-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Receipt size={24} className="bill-icon" />
                <div>
                  <h2>Final Dining Bill — Table {selectedTable.tableNumber}</h2>
                  <p className="modal-sub">Review itemized bill breakdown and complete guest settlement</p>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowBillModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body bill-receipt-body">
              {billLoading || !billData ? (
                <div className="bill-loading">
                  <RotateCw size={28} className="waiter-spin" />
                  <p>Calculating bill breakdown with taxes & service charge...</p>
                </div>
              ) : (
                <>
                  <div className="receipt-paper">
                    <div className="receipt-brand">
                      <h3>FOODFLOW PRO DINING</h3>
                      <p>Table #{billData.tableNumber} · Bill #{billData.orderId ? billData.orderId.toString().slice(-4).toUpperCase() : '---'}</p>
                      <small>{new Date().toLocaleString()}</small>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-items">
                      {billData.items && billData.items.map((item, idx) => (
                        <div key={idx} className="receipt-row">
                          <span className="r-qty">{item.quantity}x</span>
                          <span className="r-name">{item.name}</span>
                          <span className="r-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-totals">
                      <div className="receipt-row">
                        <span>Items Subtotal:</span>
                        <span>₹{Number(billData.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="receipt-row">
                        <span>GST ({billData.gstRate || '5%'}):</span>
                        <span>₹{Number(billData.gstAmount).toFixed(2)}</span>
                      </div>
                      <div className="receipt-row">
                        <span>Service Charge ({billData.serviceChargeRate || '5%'}):</span>
                        <span>₹{Number(billData.serviceCharge).toFixed(2)}</span>
                      </div>
                      <div className="receipt-divider double"></div>
                      <div className="receipt-row grand-total">
                        <strong>Grand Total:</strong>
                        <strong className="grand-amount">₹{Number(billData.grandTotal).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="payment-method-section">
                    <label className="section-label">Select Payment Method:</label>
                    <div className="payment-options-grid">
                      <button
                        type="button"
                        className={`payment-option-btn ${selectedPaymentMethod === 'Cash' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('Cash')}
                      >
                        <Banknote size={20} />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        className={`payment-option-btn ${selectedPaymentMethod === 'Card' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('Card')}
                      >
                        <CreditCard size={20} />
                        <span>Card / POS</span>
                      </button>
                      <button
                        type="button"
                        className={`payment-option-btn ${selectedPaymentMethod === 'UPI' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('UPI')}
                      >
                        <Smartphone size={20} />
                        <span>UPI</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowBillModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-settle"
                onClick={() => handleSettleTable(selectedTable.tableNumber)}
                disabled={actionLoading || billLoading}
              >
                <Check size={18} />
                <span>Confirm Payment & Free Table {selectedTable.tableNumber}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Table Order Modal (Dish Selector) */}
      {showOrderModal && selectedTable && (
        <div className="waiter-modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="waiter-modal-card order-builder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Utensils size={24} className="order-builder-icon" />
                <div>
                  <h2>Take Order for Table {selectedTable.tableNumber}</h2>
                  <p className="modal-sub">Add customer dish selections directly to the table order</p>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowOrderModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="order-builder-body">
              {/* Left Column: Menu Item Selector */}
              <div className="menu-selector-column">
                <div className="menu-search-bar">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                  {searchFilter && (
                    <button type="button" onClick={() => setSearchFilter('')} className="clear-search">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Categories Bar */}
                <div className="menu-category-tabs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Dish Grid */}
                <div className="dishes-scroll-grid">
                  {menuLoading ? (
                    <div className="menu-loading-box">
                      <RotateCw size={24} className="waiter-spin" />
                      <p>Loading dishes...</p>
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="no-dishes-box">
                      <p>No dishes found in category "{activeCategory}".</p>
                    </div>
                  ) : (
                    filteredMenuItems.map((item) => {
                      const qty = orderItemsMap[item._id]?.quantity || 0;
                      return (
                        <div key={item._id} className={`dish-item-card ${qty > 0 ? 'selected' : ''}`}>
                          <div className="dish-info">
                            <h4>{item.name}</h4>
                            <p className="dish-desc">{item.description}</p>
                            <span className="dish-price">₹{Number(item.price).toFixed(2)}</span>
                          </div>
                          <div className="dish-qty-control">
                            {qty === 0 ? (
                              <button
                                type="button"
                                className="btn-add-initial"
                                onClick={() => updateItemQty(item, 1)}
                              >
                                + Add
                              </button>
                            ) : (
                              <div className="stepper-group">
                                <button
                                  type="button"
                                  className="stepper-btn"
                                  onClick={() => updateItemQty(item, -1)}
                                >
                                  -
                                </button>
                                <span className="stepper-qty">{qty}</span>
                                <button
                                  type="button"
                                  className="stepper-btn"
                                  onClick={() => updateItemQty(item, 1)}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Order Summary Drawer */}
              <div className="order-summary-sidebar">
                <div className="sidebar-header">
                  <h3>Order Ticket</h3>
                  <span className="table-chip">Table #{selectedTable.tableNumber}</span>
                </div>

                <div className="ticket-items-list">
                  {orderCartList.length === 0 ? (
                    <div className="empty-ticket-box">
                      <Utensils size={32} />
                      <p>No dishes added yet.<br />Click items on the left to add.</p>
                    </div>
                  ) : (
                    orderCartList.map(({ menuItem, quantity }) => (
                      <div key={menuItem._id} className="ticket-item-row">
                        <div className="ticket-item-left">
                          <span className="t-qty">{quantity}x</span>
                          <span className="t-name">{menuItem.name}</span>
                        </div>
                        <div className="ticket-item-right">
                          <span className="t-price">₹{(menuItem.price * quantity).toFixed(2)}</span>
                          <button
                            type="button"
                            className="t-remove-btn"
                            onClick={() => updateItemQty(menuItem, -quantity)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Special Instructions Input */}
                <div className="special-instructions-group">
                  <label htmlFor="order-special-notes">Special Kitchen Instructions:</label>
                  <textarea
                    id="order-special-notes"
                    placeholder="e.g. Extra spicy, no onions, serve drinks first..."
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>

                {/* Calculation */}
                <div className="ticket-calculations">
                  <div className="calc-row">
                    <span>Subtotal:</span>
                    <span>₹{orderSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="calc-row">
                    <span>Estimated 5% GST:</span>
                    <span>₹{(orderSubtotal * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="calc-row total">
                    <strong>Total:</strong>
                    <strong>₹{(orderSubtotal * 1.05).toFixed(2)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-submit-order"
                  onClick={handleCreateOrder}
                  disabled={orderSubmitting || orderCartList.length === 0}
                >
                  <CheckCircle size={18} />
                  <span>{orderSubmitting ? 'Sending to Kitchen...' : `Submit to Kitchen (Table ${selectedTable.tableNumber})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterDashboard;
