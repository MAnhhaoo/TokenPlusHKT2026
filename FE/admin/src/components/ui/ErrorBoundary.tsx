import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SaigonDrain Admin Uncaught Error:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f4f8f6",
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: "24px",
            color: "#0f2e28",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e1ece6",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fef3f2",
                color: "#d92d20",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                margin: "0 0 8px",
                color: "#101828",
              }}
            >
              Đã xảy ra sự cố hiển thị giao diện
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#475467",
                margin: "0 0 20px",
                lineHeight: "1.5",
              }}
            >
              Trung tâm điều hành vừa gặp lỗi ngoại lệ khi dựng các thành phần.
              Dữ liệu an toàn và bạn có thể tải lại trang.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: "#f8faf9",
                  border: "1px solid #e2ece7",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#d92d20",
                  textAlign: "left",
                  overflowX: "auto",
                  margin: "0 0 24px",
                  maxHeight: "140px",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: "#0b4f4a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <RefreshCw size={15} /> Tải lại trang
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: "#ffffff",
                  color: "#344054",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Khôi phục mặc định
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
