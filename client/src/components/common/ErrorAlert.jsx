import React from 'react';
import './ErrorAlert.css';

/**
 * Reusable Error Alert Component for SkillVault
 * Supports contextual error states, field validation error lists,
 * retry action buttons, quota reset indicators, and dismiss actions.
 */
export function ErrorAlert({
  title,
  message,
  errors = [],
  isRetryable = false,
  onRetry = null,
  retryLabel = 'Try Again',
  resetsAt = null,
  variant = 'error', // 'error' | 'warning' | 'info'
  onDismiss = null,
  className = ''
}) {
  if (!message && (!errors || errors.length === 0)) {
    return null;
  }

  const icon = variant === 'warning' ? '⚠️' : variant === 'info' ? 'ℹ️' : '⚠️';
  const role = variant === 'info' ? 'status' : 'alert';

  return (
    <div role={role} className={`error-alert-banner alert-${variant} ${className}`.trim()}>
      <div className="error-alert-main">
        <span className="error-alert-icon" aria-hidden="true">{icon}</span>
        <div className="error-alert-content">
          {title && <h4 className="error-alert-title">{title}</h4>}
          {message && <p className="error-alert-message">{message}</p>}

          {Array.isArray(errors) && errors.length > 0 && (
            <ul className="error-alert-list">
              {errors.map((errItem, idx) => (
                <li key={idx} className="error-alert-item">
                  {typeof errItem === 'string' ? errItem : (errItem.message || JSON.stringify(errItem))}
                </li>
              ))}
            </ul>
          )}

          {resetsAt && (
            <div className="error-alert-reset">
              <span className="reset-clock-icon" aria-hidden="true">⏱️</span>
              <span>
                Daily allowance resets at 00:00 UTC ({new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="error-alert-controls">
        {isRetryable && typeof onRetry === 'function' && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-secondary error-alert-retry-btn"
          >
            {retryLabel}
          </button>
        )}
        {typeof onDismiss === 'function' && (
          <button
            type="button"
            onClick={onDismiss}
            className="error-alert-dismiss-btn"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorAlert;
