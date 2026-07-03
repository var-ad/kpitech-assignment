import { useEffect, useState, useCallback } from "react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  STATUS_LABELS,
  parsePrice,
  formatDateTime,
  type OrderData,
  Spin,
  getApiError,
} from "../components/OrderTracker";
import { useToast } from "../context/ToastContext";
import MenuManagement from "../components/MenuManagement";

// ── Dashboard types ──

interface StatusCount {
  status: string;
  count: number;
}

interface PopularItem {
  name: string;
  total_quantity: number;
}

interface DashboardData {
  orders_by_status: StatusCount[];
  todays_revenue: number;
  popular_items: PopularItem[];
}

const ALL_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
] as const;

const NEXT_STATUS: Record<string, string> = {
  placed: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "picked_up",
};

const accent = "#D43B1F";
const textMuted = "#7A6F62";

const STATUS_COLORS: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  placed: { border: "#1565C0", bg: "#E3F2FD", text: "#1565C0" },
  confirmed: { border: "#F57F17", bg: "#FFF8E1", text: "#F57F17" },
  preparing: { border: "#E65100", bg: "#FFF3E0", text: "#E65100" },
  ready: { border: "#2E7D32", bg: "#E8F5E9", text: "#2E7D32" },
  picked_up: { border: "#616161", bg: "#F5F5F5", text: "#616161" },
};

type AdminTab = "dashboard" | "orders" | "menu";

export default function Admin() {
  const { toast } = useToast();
  const { token, login, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // ── Login handler ──

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: unknown) {
      setLoginError(getApiError(err, "Login failed"));
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Fetch dashboard ──

  const fetchDashboard = useCallback(() => {
    if (!token) return;
    setDashLoading(true);
    setDashError(null);
    apiClient
      .get<DashboardData>("/api/admin/dashboard")
      .then((res) => {
        setData(res.data);
        setDashLoading(false);
      })
      .catch((err) => {
        setDashError(
          err.response?.status === 401
            ? "Session expired. Please log in again."
            : "Failed to load dashboard",
        );
        setDashLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
  }, [activeTab, fetchDashboard]);

  // ── Fetch orders ──

  const fetchOrders = useCallback(() => {
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError(null);
    const url = statusFilter
      ? `/api/admin/orders?status=${statusFilter}`
      : "/api/admin/orders";
    apiClient
      .get<OrderData[]>(url)
      .then((res) => {
        setOrders(res.data);
        setOrdersLoading(false);
      })
      .catch((err) => {
        setOrdersError(
          err.response?.status === 401
            ? "Session expired."
            : "Failed to load orders",
        );
        setOrdersLoading(false);
      });
  }, [token, statusFilter]);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
  }, [activeTab, fetchOrders]);

  // ── Advance order status ──

  const handleAdvanceStatus = async (orderId: number, nextStatus: string) => {
    try {
      const label =
        nextStatus.charAt(0).toUpperCase() +
        nextStatus.slice(1).replace(/_/, " ");
      await apiClient.patch(`/api/admin/orders/${orderId}/status`, {
        status: nextStatus,
      });
      fetchOrders();
      toast(`Order #${orderId} advanced to ${label}`, "success");
    } catch (err: unknown) {
      toast(getApiError(err, "Failed to update status"), "error");
    }
  };

  // ── Render: Not authenticated → login form ──

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600 text-center">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                loginLoading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loginLoading ? (
                <>
                  <Spin /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Use an admin account to manage orders and menu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dashboard"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "orders"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "menu"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Menu Items
          </button>
        </div>

        {/* ── Dashboard tab ── */}
        {activeTab === "dashboard" && (
          <>
            {dashLoading ? (
              <div className="animate-pulse" style={{ padding: "20px 0" }}>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: "#EDE7DF",
                    borderRadius: "4px",
                    width: "160px",
                    marginBottom: "12px",
                  }}
                />
                <div
                  style={{
                    height: "48px",
                    backgroundColor: "#EDE7DF",
                    borderRadius: "6px",
                    width: "300px",
                    marginBottom: "24px",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "10px",
                    marginBottom: "24px",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: "80px",
                        backgroundColor: i === 1 ? "#EDE7DF" : "#F5F0EB",
                        borderRadius: "6px",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    height: "14px",
                    backgroundColor: "#EDE7DF",
                    borderRadius: "4px",
                    width: "120px",
                    marginBottom: "12px",
                  }}
                />
                <div
                  style={{
                    height: "40px",
                    backgroundColor: "#F5F0EB",
                    borderRadius: "6px",
                    width: "100%",
                    marginBottom: "6px",
                  }}
                />
                <div
                  style={{
                    height: "40px",
                    backgroundColor: "#F5F0EB",
                    borderRadius: "6px",
                    width: "100%",
                  }}
                />
              </div>
            ) : dashError ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p
                  style={{
                    color: accent,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  {dashError}
                </p>
                <button
                  onClick={fetchDashboard}
                  style={{
                    color: accent,
                    fontSize: "0.8125rem",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : data ? (
              <>
                {/* Revenue card - accent top border, large number */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: "#E2DCD3",
                    overflow: "hidden",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ height: "3px", backgroundColor: accent }} />
                  <div style={{ padding: "20px 24px" }}>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        margin: "0 0 6px",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      Today's Revenue
                    </p>
                    <p
                      style={{
                        fontSize: "2.5rem",
                        fontWeight: 700,
                        fontFamily: "Sora, sans-serif",
                        color: "#1A1410",
                        margin: 0,
                        lineHeight: 1.1,
                      }}
                    >
                      ₹{parsePrice(data.todays_revenue).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order status cards - compact colored-top tiles */}
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        fontFamily: "Sora, sans-serif",
                        color: "#1A1410",
                        margin: 0,
                      }}
                    >
                      Orders by Status
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: textMuted,
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      ({data.orders_by_status.reduce((a, b) => a + b.count, 0)}{" "}
                      total)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "10px",
                    }}
                  >
                    {ALL_STATUSES.map((status) => {
                      const count =
                        data.orders_by_status.find((s) => s.status === status)
                          ?.count || 0;
                      return (
                        <button
                          key={status}
                          onClick={() => {
                            setStatusFilter(status);
                            setActiveTab("orders");
                          }}
                          style={{
                            backgroundColor: count > 0 ? "#FFFFFF" : "#F7F5F3",
                            borderRadius: "8px",
                            border: "1.5px solid",
                            borderColor: "#E2DCD3",
                            padding: "16px 12px 14px",
                            textAlign: "center",
                            cursor: "pointer",
                            opacity: count > 0 ? 1 : 0.5,
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.15s ease",
                            borderTop: `3px solid ${(STATUS_COLORS[status] || {}).border || "#E2DCD3"}`,
                          }}
                          onMouseEnter={(e) => {
                            if (count > 0) {
                              e.currentTarget.style.borderColor = accent;
                              e.currentTarget.style.boxShadow =
                                "0 2px 8px rgba(0,0,0,0.06)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (count > 0) {
                              e.currentTarget.style.borderColor = "#E2DCD3";
                              e.currentTarget.style.boxShadow = "none";
                            }
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              color: textMuted,
                              margin: "0 0 6px",
                              fontFamily: "DM Sans, sans-serif",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {STATUS_LABELS[status]}
                          </p>
                          <p
                            style={{
                              fontSize: "1.75rem",
                              fontWeight: 700,
                              fontFamily: "Sora, sans-serif",
                              color: "#1A1410",
                              margin: 0,
                              lineHeight: 1,
                            }}
                          >
                            {count}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Popular items - table */}
                <div>
                  <h3
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      fontFamily: "Sora, sans-serif",
                      color: "#1A1410",
                      margin: "0 0 12px",
                    }}
                  >
                    Popular Items
                  </h3>
                  {data.popular_items.length === 0 ? (
                    <p
                      style={{
                        color: textMuted,
                        fontSize: "0.8125rem",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      No items ordered yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        border: "1.5px solid",
                        borderColor: "#E2DCD3",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {data.popular_items.map((item, idx) => (
                        <div
                          key={item.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 18px",
                            borderBottom:
                              idx < data.popular_items.length - 1
                                ? "1px solid #EDE7DF"
                                : "none",
                            backgroundColor:
                              idx % 2 === 0 ? "#FFFFFF" : "#FAF8F6",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: textMuted,
                                fontFamily: "Sora, sans-serif",
                                width: "24px",
                                textAlign: "right",
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <span
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                fontFamily: "Sora, sans-serif",
                                color: "#1A1410",
                              }}
                            >
                              {item.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 500,
                              color: textMuted,
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            {item.total_quantity} ordered
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ── Menu Items tab ── */}
        {activeTab === "menu" && <MenuManagement />}

        {/* ── Orders tab ── */}
        {activeTab === "orders" && (
          <>
            {/* Status filter - admin pill style */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "16px",
                alignItems: "center",
              }}
            >
              {[null, ...ALL_STATUSES].map((s) => {
                const isActive = statusFilter === s;
                const label = s ? STATUS_LABELS[s] : "All";
                return (
                  <button
                    key={label}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "1.5px solid",
                      borderColor: isActive ? accent : "#D4CDC3",
                      backgroundColor: isActive ? accent : "transparent",
                      color: isActive ? "#FFFFFF" : textMuted,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "DM Sans, sans-serif",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = accent;
                        e.currentTarget.style.color = accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = "#D4CDC3";
                        e.currentTarget.style.color = textMuted;
                      }
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                style={{
                  marginLeft: "auto",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1.5px solid #D4CDC3",
                  backgroundColor: "transparent",
                  color: textMuted,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  cursor: ordersLoading ? "not-allowed" : "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  opacity: ordersLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!ordersLoading) {
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.color = accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!ordersLoading) {
                    e.currentTarget.style.borderColor = "#D4CDC3";
                    e.currentTarget.style.color = textMuted;
                  }
                }}
              >
                {ordersLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            {/* Loading */}
            {ordersLoading && (
              <div className="animate-pulse" style={{ padding: "20px 0" }}>
                <div
                  style={{
                    height: "12px",
                    backgroundColor: "#EDE7DF",
                    borderRadius: "4px",
                    width: "200px",
                    marginBottom: "16px",
                  }}
                />
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: "64px",
                      backgroundColor: i === 1 ? "#EDE7DF" : "#F5F0EB",
                      borderRadius: "6px",
                      width: "100%",
                      marginBottom: "8px",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {ordersError && !ordersLoading && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p
                  style={{
                    color: accent,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  {ordersError}
                </p>
                <button
                  onClick={fetchOrders}
                  style={{
                    color: accent,
                    fontSize: "0.8125rem",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                  📋
                </div>
                <p
                  style={{
                    color: "#5C4F42",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    marginBottom: "4px",
                  }}
                >
                  {statusFilter
                    ? `No orders with status "${STATUS_LABELS[statusFilter] || statusFilter}"`
                    : "No orders yet"}
                </p>
                <p style={{ color: textMuted, fontSize: "0.85rem" }}>
                  {statusFilter
                    ? "Try selecting a different status filter."
                    : "Orders will appear here once customers place them."}
                </p>
              </div>
            )}

            {/* Orders list - dense table rows */}
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div
                style={{
                  border: "1.5px solid",
                  borderColor: "#E2DCD3",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.6fr 0.7fr 2fr 0.6fr 0.8fr 1fr",
                    backgroundColor: "#F7F5F3",
                    borderBottom: "1.5px solid #E2DCD3",
                  }}
                >
                  {["Order", "Status", "Items", "Total", "Time", "Action"].map(
                    (h) => (
                      <div
                        key={h}
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {h}
                      </div>
                    ),
                  )}
                </div>

                {/* Rows */}
                {orders.map((order, idx) => {
                  const nextStatus = NEXT_STATUS[order.status];
                  const isTerminal = order.status === "picked_up";
                  return (
                    <div
                      key={order.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "0.6fr 0.7fr 2fr 0.6fr 0.8fr 1fr",
                        borderBottom:
                          idx < orders.length - 1
                            ? "1px solid #EDE7DF"
                            : "none",
                        backgroundColor: "#FFFFFF",
                        fontSize: "0.8125rem",
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#FAF8F6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                      }}
                    >
                      {/* Order ID */}
                      <div
                        style={{
                          padding: "14px 14px",
                          fontFamily: "Sora, sans-serif",
                          fontWeight: 700,
                          color: "#1A1410",
                          alignSelf: "center",
                        }}
                      >
                        #{order.id}
                      </div>

                      {/* Status badge */}
                      <div
                        style={{ padding: "14px 14px", alignSelf: "center" }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "4px",
                            backgroundColor:
                              (STATUS_COLORS[order.status] || {}).bg ||
                              "#F5F0EB",
                            color:
                              (STATUS_COLORS[order.status] || {}).text ||
                              "#5C4F42",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>

                      {/* Items summary */}
                      <div
                        style={{
                          padding: "14px 14px",
                          color: textMuted,
                          alignSelf: "center",
                          fontSize: "0.75rem",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {order.items
                          .slice(0, 2)
                          .map((it) => `${it.name} ×${it.quantity}`)
                          .join(", ")}
                        {order.items.length > 2 && (
                          <span style={{ color: "#B0A89E" }}>
                            {" "}
                            +{order.items.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Total */}
                      <div
                        style={{
                          padding: "14px 14px",
                          fontWeight: 700,
                          fontFamily: "Sora, sans-serif",
                          color: "#1A1410",
                          alignSelf: "center",
                          fontSize: "0.8125rem",
                        }}
                      >
                        ₹{parsePrice(order.total_amount).toFixed(2)}
                      </div>

                      {/* Time */}
                      <div
                        style={{
                          padding: "14px 14px",
                          color: textMuted,
                          alignSelf: "center",
                          fontSize: "0.6875rem",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {formatDateTime(order.created_at)}
                      </div>

                      {/* Action */}
                      <div
                        style={{ padding: "14px 14px", alignSelf: "center" }}
                      >
                        {!isTerminal && nextStatus ? (
                          <button
                            onClick={() =>
                              handleAdvanceStatus(order.id, nextStatus)
                            }
                            style={{
                              padding: "6px 14px",
                              borderRadius: "4px",
                              border: "1.5px solid",
                              borderColor: accent,
                              backgroundColor: "transparent",
                              color: accent,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "DM Sans, sans-serif",
                              transition: "all 0.1s",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = accent;
                              e.currentTarget.style.color = "#FFFFFF";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.color = accent;
                            }}
                          >
                            → {STATUS_LABELS[nextStatus]}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "#B0A89E",
                              fontStyle: "italic",
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            Complete
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
