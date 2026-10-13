import React, { useState } from 'react';
import { mockProducts } from '../data/mockProducts';
import { Bell, Package, LayoutDashboard, AlertCircle, Edit2 } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const initialOrders = [
  { id: 'ORD-001', customer: 'Alex Johnson', type: 'VIP', items: 2, total: 320, status: 'New', time: '10m ago' },
  { id: 'ORD-002', customer: 'Sam Smith', type: 'First-Time', items: 1, total: 260, status: 'New', time: '1h ago' },
  { id: 'ORD-003', customer: 'Jordan Lee', type: 'Returning', items: 3, total: 955, status: 'Packing', time: '3h ago' },
  { id: 'ORD-004', customer: 'Casey Williams', type: 'VIP', items: 1, total: 340, status: 'Shipped', time: '1d ago' },
];

const mockNotifications = [
  { id: 1, title: 'New Order Received', message: 'Alex Johnson placed an order (ORD-001) for $320.', time: '10m ago', unread: true },
  { id: 2, title: 'Low Stock Alert', message: 'Plush Cocoon Fur Jacket is down to 2 units in stock.', time: '2h ago', unread: true },
  { id: 3, title: 'Payment Cleared', message: 'Payment for ORD-004 has successfully cleared.', time: '1d ago', unread: false },
];

const Admin = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const lowStockProducts = mockProducts.filter(p => p.stock <= 3);

  const getStatusColumn = (statusName) => {
    return orders.filter(o => o.status === statusName);
  };

  const moveOrder = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <PageTransition className="admin-page flex h-screen w-full">
      
      {/* Sidebar */}
      <div className="admin-sidebar flex flex-col w-64 flex-shrink-0 h-full">
        <div className="brand">
          <h2>Mazhari Admin</h2>
        </div>
        <nav className="nav-links flex flex-col flex-grow">
          <button 
            className={`nav-btn flex items-center gap-3 ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            className={`nav-btn flex items-center gap-3 ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={18} /> Inventory
          </button>
          <button 
            className={`nav-btn flex items-center gap-3 relative ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} /> Notifications
            <span className="badge absolute">2</span>
          </button>
        </nav>
        <div className="user-profile flex items-center gap-3">
          <div className="avatar flex items-center justify-center">A</div>
          <div>
            <p className="name">Admin User</p>
            <p className="role">Owner</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main flex-grow flex flex-col h-full overflow-hidden">
        
        <div className="topbar flex justify-between items-center">
          <h1>
            {activeTab === 'dashboard' && 'Order Pipeline'}
            {activeTab === 'inventory' && 'Inventory Management'}
            {activeTab === 'notifications' && 'Recent Notifications'}
          </h1>
          <button className="primary-btn">
            {activeTab === 'inventory' ? 'Add Product' : 'Export Report'}
          </button>
        </div>

        <div className="dashboard-content flex-grow overflow-x-auto overflow-y-auto">
          
          <AnimatePresence mode="wait">
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {lowStockProducts.length > 0 && (
                  <div className="inventory-alerts flex flex-col gap-4">
                    <h3 className="flex items-center gap-2">
                      <AlertCircle size={18} className="alert-icon" /> Low Stock Alerts
                    </h3>
                    <div className="alerts-grid grid grid-cols-1 md:grid-cols-3 gap-4">
                      {lowStockProducts.map(p => (
                        <div key={p.id} className="alert-card flex justify-between items-center">
                          <div>
                            <h4>{p.name}</h4>
                            <p>Stock: {p.stock}</p>
                          </div>
                          <button className="restock-btn">Restock</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="kanban-board flex gap-6 h-full">
                  {['New', 'Packing', 'Shipped', 'Delivered'].map(status => (
                    <div key={status} className="kanban-column flex flex-col w-80 flex-shrink-0">
                      <div className="col-header flex justify-between items-center">
                        <h3>{status}</h3>
                        <span className="count">{getStatusColumn(status).length}</span>
                      </div>
                      
                      <div className="col-body flex flex-col gap-4 flex-grow">
                        {getStatusColumn(status).map(order => (
                          <div key={order.id} className="order-card flex flex-col">
                            <div className="card-header flex justify-between items-start">
                              <span className="order-id">{order.id}</span>
                              <span className="time">{order.time}</span>
                            </div>
                            <div className="customer-info">
                              <p className="name">{order.customer}</p>
                              <span className={`type-badge ${order.type.toLowerCase().replace('-', '')}`}>
                                {order.type}
                              </span>
                            </div>
                            <div className="card-footer flex justify-between items-center">
                              <span className="total">${order.total} ({order.items} items)</span>
                              <div className="move-actions flex gap-2">
                                {status !== 'New' && (
                                  <button 
                                    className="move-btn back"
                                    onClick={() => {
                                      const prevStatus = status === 'Delivered' ? 'Shipped' : status === 'Shipped' ? 'Packing' : 'New';
                                      moveOrder(order.id, prevStatus);
                                    }}
                                  >
                                    &lt;- Prev
                                  </button>
                                )}
                                {status !== 'Delivered' && (
                                  <button 
                                    className="move-btn"
                                    onClick={() => {
                                      const nextStatus = status === 'New' ? 'Packing' : status === 'Packing' ? 'Shipped' : 'Delivered';
                                      moveOrder(order.id, nextStatus);
                                    }}
                                  >
                                    Next -&gt;
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB: INVENTORY */}
            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="inventory-view flex flex-col gap-4"
              >
                <div className="inventory-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {mockProducts.map(product => (
                    <div key={product.id} className="inventory-card flex flex-col">
                      <div className="img-wrapper relative">
                        <img src={product.images[0]} alt={product.name} className="w-full object-cover absolute inset-0" />
                        <span className={`stock-badge absolute ${product.stock <= 3 ? 'low' : 'good'}`}>
                          {product.stock} in stock
                        </span>
                      </div>
                      <div className="product-details flex flex-col flex-grow justify-between">
                        <div>
                          <h4>{product.name}</h4>
                          <p className="meta">${product.price} | Shipping: ${product.shippingFee}</p>
                          <p className="meta">Sizes: {product.sizes.join(', ')}</p>
                        </div>
                        <button className="edit-btn w-full flex items-center justify-center gap-2">
                          <Edit2 size={14} /> Edit Product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="notifications-view flex flex-col gap-4"
              >
                {mockNotifications.map(note => (
                  <div key={note.id} className={`notification-card flex flex-col ${note.unread ? 'unread' : ''}`}>
                    <div className="note-header flex justify-between items-center">
                      <h4>{note.title}</h4>
                      <span className="time">{note.time}</span>
                    </div>
                    <p>{note.message}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </div>
    </PageTransition>
  );
};

export default Admin;
