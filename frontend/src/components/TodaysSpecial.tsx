import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { useCart } from "../context/CartContext";
import { parsePrice } from "./OrderTracker";

interface SpecialItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number | string;
  is_vegetarian: boolean;
  is_spicy: boolean;
}

const accent = "#D43B1F";

export default function TodaysSpecial() {
  const [items, setItems] = useState<SpecialItem[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    apiClient
      .get<SpecialItem[]>("/api/menu/specials")
      .then((res) => setItems(res.data))
      .catch(() => {}); // silently fail - feature is non-critical
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>⭐</span>
        <span
          style={{
            fontWeight: 700,
            fontFamily: "Sora, sans-serif",
            color: "#1A1410",
            fontSize: "1rem",
          }}
        >
          Today's Special
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#A09080",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scrollable row */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              flex: "0 0 220px",
              backgroundColor: "#FFF8E1",
              borderRadius: "12px",
              border: "1.5px solid #FDE68A",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "0.75rem" }}>⭐</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#D97706",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Special
              </span>
              {item.is_vegetarian && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "#1A7A44",
                    backgroundColor: "#E8F5E9",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    marginLeft: "auto",
                  }}
                >
                  Veg
                </span>
              )}
              {item.is_spicy && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "#D97706",
                    backgroundColor: "#FFF7ED",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    marginLeft: item.is_vegetarian ? "2px" : "auto",
                  }}
                >
                  Spicy
                </span>
              )}
            </div>

            <div
              style={{
                fontWeight: 700,
                fontFamily: "Sora, sans-serif",
                color: "#1A1410",
                fontSize: "0.9rem",
                marginBottom: "2px",
              }}
            >
              {item.name}
            </div>

            {item.description && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#5C4F42",
                  fontFamily: "DM Sans, sans-serif",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: "8px",
                }}
              >
                {item.description}
              </div>
            )}

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontFamily: "Sora, sans-serif",
                  color: accent,
                  fontSize: "1.1rem",
                }}
              >
                ₹{parsePrice(item.price).toFixed(2)}
              </span>
              <button
                onClick={() =>
                  addItem({
                    menuItemId: item.id,
                    name: item.name,
                    price: parsePrice(item.price),
                  })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: accent,
                  backgroundColor: accent,
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  transition: "all 0.15s",
                }}
              >
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
