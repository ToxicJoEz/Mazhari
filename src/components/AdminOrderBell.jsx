import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowUpRight } from 'lucide-react';
import { useOrderNotifications } from '../context/notifications';
import { Modal } from './UI';
import { money, date } from '../lib/store';
export default function AdminOrderBell({ sidebar = false }) {
  const [open, setOpen] = useState(false);
  const notifications = useOrderNotifications();
  if (!notifications?.enabled) return null;
  const count = notifications.data?.count ?? 0;
  return (
    <>
      <button
        type="button"
        className={'notification-trigger ' + (sidebar ? 'sidebar-notifications' : 'icon-btn')}
        aria-label={`New orders: ${count} pending`}
        onClick={() => {
          setOpen(true);
          notifications.refresh();
        }}
      >
        <Bell size={20} />
        {sidebar && <span>New orders</span>}
        {count > 0 && <span className="notification-count">{count}</span>}
      </button>
      {open && (
        <Modal title="New orders" onClose={() => setOpen(false)} className="notifications-modal">
          <p className="muted">
            {count} pending {count === 1 ? 'order needs' : 'orders need'} attention. The count
            updates when orders leave pending.
          </p>
          {notifications.error && (
            <div className="notice error" role="alert">
              {notifications.error}
              <button type="button" className="text-link" onClick={notifications.refresh}>
                Retry
              </button>
            </div>
          )}
          {!notifications.data && !notifications.error && (
            <p role="status">Loading new orders...</p>
          )}
          <div className="notification-list">
            {notifications.data?.orders.map((order) => (
              <Link
                className="notification-order"
                to={'/admin/orders?order=' + order._id}
                key={order._id}
                onClick={() => setOpen(false)}
              >
                <span>
                  <strong>{order.orderNumber}</strong>
                  <span>
                    {order.customer.name} ·{' '}
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                    {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1
                      ? 'item'
                      : 'items'}
                  </span>
                  <small>{date(order.createdAt)}</small>
                </span>
                <span>
                  {money(order.total)} <ArrowUpRight size={16} />
                </span>
              </Link>
            ))}
          </div>
          {notifications.data && count === 0 && (
            <div className="state-panel">
              <Bell />
              <h3>You’re all caught up.</h3>
              <p>New orders will appear here.</p>
            </div>
          )}
          <Link className="btn secondary" to="/admin/orders" onClick={() => setOpen(false)}>
            View all orders
          </Link>
        </Modal>
      )}
    </>
  );
}
