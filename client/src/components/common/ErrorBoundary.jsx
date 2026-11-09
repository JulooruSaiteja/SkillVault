import React from 'react';
import './ErrorBoundary.css';

/**
 * Global/Component Error Boundary for SkillVault.
 * Catches rendering exceptions and prevents full-application whiteout screens.
 * Provides classroom-themed recovery actions.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (typeof console !== 'undefined' && console.error) {
      console.error('[SkillVault ErrorBoundary caught exception]:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <section className="error-boundary-container" role="alert">
          <div className="card error-boundary-card">
            <div className="error-boundary-icon-wrapper">
              <span className="error-boundary-icon" aria-hidden="true">⚠️</span>
            </div>
            <h1 className="error-boundary-title">
              {this.props.title || 'An Unexpected Error Occurred'}
            </h1>
            <p className="error-boundary-description">
              {this.props.description ||
                'The digital classroom encountered a rendering issue while processing this view. Your saved progress remains safe.'}
            </p>

            {this.state.error?.message && (
              <div className="error-boundary-technical">
                <span className="error-boundary-badge">Details</span>
                <code className="error-boundary-code">{this.state.error.message}</code>
              </div>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn btn-secondary error-boundary-btn"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-secondary error-boundary-btn"
              >
                Reload Lesson
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-primary error-boundary-btn"
              >
                Return to Home
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
