import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/* -------------------------------------------------------------------------- */
/* Error Boundary */
/* -------------------------------------------------------------------------- */

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400">
              Please refresh the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* Mount app ONCE */
/* -------------------------------------------------------------------------- */

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
