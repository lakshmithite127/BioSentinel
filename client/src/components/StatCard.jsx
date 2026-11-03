import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable StatCard component (Task 2: Clickable with Hover & Transitions)
 * @param {string} title - Card title
 * @param {string|number} value - Primary metric value
 * @param {string} change - Percentage change string (e.g. "+13%")
 * @param {string} period - Comparison period (e.g. "vs last week")
 * @param {string} type - "trend" | "bars" | "donut" | "columns"
 * @param {string} status - "positive" | "negative"
 * @param {React.ReactNode} icon - Optional custom icon
 * @param {Function} onClick - Click handler for navigation / filtering
 */
export default function StatCard({
  title,
  value,
  change = '+13%',
  period = 'vs last week',
  type = 'trend',
  status = 'positive',
  icon,
  onClick
}) {
  return (
    <div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      title={onClick ? `Click to view ${title}` : undefined}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease'
      }}
    >
      <div className="stat-card-header">
        {icon || <AlertCircle size={17} color="#64748b" />}
        <span>{title}</span>
      </div>

      <div className="stat-card-value">{value}</div>

      <div className="stat-card-footer">
        <span className={`stat-badge ${status}`}>
          {change} {period}
        </span>

        <div className="stat-sparkline">
          {type === 'trend' && (
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
              <path
                d="M 2 20 L 14 16 L 26 18 L 38 6 L 46 6 M 46 6 L 38 6 M 46 6 L 46 14"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="2" y1="23" x2="46" y2="23" stroke="#0d9488" strokeWidth="2.5" />
            </svg>
          )}

          {type === 'bars' && (
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
              <rect x="2" y="16" width="6" height="8" rx="2" fill="#005e9e" />
              <rect x="12" y="11" width="6" height="13" rx="2" fill="#005e9e" />
              <rect x="22" y="6" width="6" height="18" rx="2" fill="#005e9e" />
              <rect x="32" y="1" width="6" height="23" rx="2" fill="#005e9e" />
            </svg>
          )}

          {type === 'donut' && (
            <svg width="30" height="30" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3.8"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                fill="none"
                stroke="#0d9488"
                strokeWidth="3.8"
                strokeDasharray="75, 100"
                strokeLinecap="round"
              />
            </svg>
          )}

          {type === 'columns' && (
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
              <rect x="2" y="12" width="6" height="12" rx="2" fill="#005e9e" />
              <rect x="12" y="4" width="6" height="20" rx="2" fill="#005e9e" />
              <rect x="22" y="1" width="6" height="23" rx="2" fill="#005e9e" />
              <rect x="32" y="8" width="6" height="16" rx="2" fill="#005e9e" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
