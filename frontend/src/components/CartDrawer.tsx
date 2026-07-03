import { useState } from "react";
import apiClient from "../api/client";
import { useCart } from "../context/CartContext";
import OrderTracker, {
  parsePrice,
  type OrderData,
  Spin,
  getApiError,
} from "./OrderTracker";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const accent = "#D43B1F";
const accentHover = "#BA2E14";

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderData | null>(
    null,
  );

  if (!open) return null;

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      const payload = {
        items: items.map((i) => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
        })),
      };
      const res = await apiClient.post<OrderData>("/api/orders", payload);
      setOrderConfirmation(res.data);
      clearCart();
    } catch (err: unknown) {
      setPlaceError(getApiError(err, "Failed to place order"));
    } finally {
      setPlacing(false);
    }
  };

  const handleClose = () => {
    setOrderConfirmation(null);
    setPlaceError(null);
    onClose();
  };

  const handleBackToCart = () => {
    setOrderConfirmation(null);
    setPlaceError(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
        style={{ animation: "slideIn 0.25s ease-out" }}
      >
        {/* Gradient accent bar */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, #D43B1F, #E8A040)",
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1.5px solid #E5DDD3" }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              fontFamily: "Sora, sans-serif",
              color: "#1A1410",
              margin: 0,
            }}
          >
            {orderConfirmation
              ? "Order Placed!"
              : `Your Cart (${items.length})`}
          </h2>
          <div className="flex items-center gap-3">
            {!orderConfirmation && items.length > 0 && (
              <button
                onClick={clearCart}
                style={{
                  color: "#A09080",
                  fontSize: "0.8rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#A09080";
                }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                color: "#A09080",
                fontSize: "1.5rem",
                lineHeight: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#1A1410";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#A09080";
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "24px 24px 16px" }}
        >
          {orderConfirmation ? (
            /* ── Confirmation view ── */
            <div className="space-y-5">
              {/* Success indicator */}
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#E8F5E9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: "1.75rem",
                  }}
                >
                  ✓
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                    color: "#1B5E20",
                    margin: "0 0 4px",
                  }}
                >
                  Order #{orderConfirmation.id}
                </h3>
                <p
                  style={{ color: "#2E7D32", fontSize: "0.875rem", margin: 0 }}
                >
                  Your order has been placed!
                </p>
              </div>

              {/* Status */}
              <div>
                <h4
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#5C4F42",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Status
                </h4>
                <OrderTracker currentStatus={orderConfirmation.status} />
              </div>

              {/* Items */}
              <div>
                <h4
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#5C4F42",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Items
                </h4>
                <div style={{ borderTop: "1px solid #E5DDD3" }}>
                  {orderConfirmation.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #F0EBE5",
                      }}
                    >
                      <span style={{ color: "#1A1410", fontSize: "0.9rem" }}>
                        {item.name}{" "}
                        <span style={{ color: "#A09080" }}>
                          ×{item.quantity}
                        </span>
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#D43B1F",
                          fontSize: "0.9rem",
                          fontFamily: "Sora, sans-serif",
                        }}
                      >
                        ₹
                        {(parsePrice(item.unit_price) * item.quantity).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "4px",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                    color: "#1A1410",
                    fontSize: "1.125rem",
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                    color: "#D43B1F",
                    fontSize: "1.25rem",
                  }}
                >
                  ₹{parsePrice(orderConfirmation.total_amount).toFixed(2)}
                </span>
              </div>

              <p
                style={{
                  fontSize: "0.75rem",
                  textAlign: "center",
                  color: "#A09080",
                  marginTop: "8px",
                }}
              >
                Order #{orderConfirmation.id} - save this ID to track your order
              </p>
            </div>
          ) : (
            /* ── Cart items view ── */
            <>
              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                    🛒
                  </div>
                  <p
                    style={{
                      color: "#5C4F42",
                      fontWeight: 500,
                      fontSize: "1rem",
                      marginBottom: "4px",
                    }}
                  >
                    Your cart is empty
                  </p>
                  <p style={{ color: "#A09080", fontSize: "0.85rem" }}>
                    Add items from the menu to get started
                  </p>
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((item) => (
                    <li
                      key={item.menuItemId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 0",
                        borderBottom: "1px solid #F0EBE5",
                      }}
                    >
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: 600,
                            fontFamily: "Sora, sans-serif",
                            color: "#1A1410",
                            margin: 0,
                            fontSize: "0.95rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </p>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "#A09080",
                            margin: "2px 0 0",
                          }}
                        >
                          ₹{item.price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Stepper */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          border: "1.5px solid #E5DDD3",
                          borderRadius: "8px",
                          padding: "2px",
                        }}
                      >
                        <button
                          onClick={() =>
                            updateQuantity(item.menuItemId, item.quantity - 1)
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: accent,
                            cursor: "pointer",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background-color 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFF5F2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            width: "28px",
                            textAlign: "center",
                            fontWeight: 600,
                            fontFamily: "Sora, sans-serif",
                            color: "#1A1410",
                            fontSize: "0.95rem",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.menuItemId, item.quantity + 1)
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: accent,
                            cursor: "pointer",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background-color 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFF5F2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Line total */}
                      <div style={{ textAlign: "right", minWidth: "64px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "Sora, sans-serif",
                            color: "#D43B1F",
                            fontSize: "0.95rem",
                          }}
                        >
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        style={{
                          color: "#D1C9BF",
                          cursor: "pointer",
                          background: "none",
                          border: "none",
                          fontSize: "1.2rem",
                          padding: "4px",
                          lineHeight: 1,
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = accent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#D1C9BF";
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px 24px 24px",
            flexShrink: 0,
          }}
        >
          {orderConfirmation ? (
            <button
              onClick={handleBackToCart}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1.5px solid",
                borderColor: accent,
                color: accent,
                backgroundColor: "transparent",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                fontFamily: "DM Sans, sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accent;
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = accent;
              }}
            >
              Continue Browsing
            </button>
          ) : (
            <>
              {/* Dashed receipt separator */}
              <div
                style={{
                  borderTop: "2px dashed #E5DDD3",
                  marginBottom: "16px",
                }}
              />

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                    color: "#1A1410",
                    fontSize: "1.125rem",
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "Sora, sans-serif",
                    color: accent,
                    fontSize: "1.375rem",
                  }}
                >
                  ₹{total.toFixed(2)}
                </span>
              </div>

              {/* Error */}
              {placeError && (
                <p
                  style={{
                    fontSize: "0.85rem",
                    textAlign: "center",
                    color: accent,
                    marginBottom: "12px",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {placeError}
                </p>
              )}

              {/* Place Order */}
              <button
                onClick={handlePlaceOrder}
                disabled={items.length === 0 || placing}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "none",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor:
                    items.length === 0 || placing ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "DM Sans, sans-serif",
                  backgroundColor:
                    items.length === 0 || placing ? "#D1C9BF" : accent,
                  transform:
                    items.length > 0 && !placing ? "translateY(0)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (items.length > 0 && !placing) {
                    e.currentTarget.style.backgroundColor = accentHover;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(212,59,31,0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (items.length > 0 && !placing) {
                    e.currentTarget.style.backgroundColor = accent;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {placing ? (
                  <>
                    <Spin className="h-5 w-5" /> Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
