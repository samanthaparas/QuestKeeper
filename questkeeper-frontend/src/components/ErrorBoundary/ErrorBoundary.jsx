import { Component } from "react";
import lantern from "../../assets/support/lantern.webp";
import "./ErrorBoundary.css";

// A safety net for the whole app: if drawing a page throws, a small card says
// so instead of leaving a blank screen. It catches only errors made while a
// page is being drawn; failed requests keep using their own messages.
//
// It sits outside the router, so it can't assume the router still works:
// Go home changes the address by hand and reloads. Nothing is retried by
// itself, nothing stored on the device is cleared and nobody is signed out.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  goHome = () => {
    window.location.hash = "#/";
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="error-fallback">
        <div className="error-fallback__card">
          <img className="error-fallback__thumb" src={lantern} alt="" width="64" height="64" />
          <h1 className="error-fallback__title">Something went wrong</h1>
          <p className="error-fallback__text">We couldn&apos;t show this page. Try reloading.</p>
          <div className="error-fallback__actions">
            <button type="button" className="error-fallback__button error-fallback__button--primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button type="button" className="error-fallback__button" onClick={this.goHome}>
              Go home
            </button>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
