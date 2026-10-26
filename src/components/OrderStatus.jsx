import { ORDER_STATUSES } from '../../shared/constants';
import { label } from '../lib/store';
export function StatusBadge({ status }) {
  return (
    <span className={'badge order-status ' + status}>
      <span aria-hidden="true" className="status-dot" />
      {label(status)}
    </span>
  );
}
export function StatusButtons({
  value,
  onChange,
  counts,
  all = false,
  disabled = false,
  ariaLabel = 'Order status',
}) {
  return (
    <div className="status-filters" role="group" aria-label={ariaLabel}>
      {(all ? ['', ...ORDER_STATUSES] : ORDER_STATUSES).map((status) => (
        <button
          type="button"
          key={status}
          disabled={disabled}
          className={'status-choice ' + (status || 'all') + (value === status ? ' selected' : '')}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
        >
          <span className="status-dot" aria-hidden="true" />
          {status ? label(status) : 'All'}
          {counts && (
            <span className="status-count">
              {status
                ? counts[status] || 0
                : Object.values(counts).reduce((sum, count) => sum + count, 0)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
