import { useState } from "react";
import apiClient from "../api/client";
import MenuItemCard, { type MenuItemData } from "./MenuItemCard";

interface SearchResponse {
  items: MenuItemData[];
  relaxed_filters: boolean;
  relaxed_note: string | null;
}

const EXAMPLE_CHIPS = [
  "Vegetarian under ₹200",
  "Spicy noodles",
  "Healthy lunch",
  "Sweet dessert",
];

const accent = "#D43B1F";
const accentHover = "#BA2E14";
const borderColor = "#E5DDD3";
const textBody = "#5C4F42";
const textMuted = "#A09080";

export default function AISearchBar({ onClear }: { onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { query: q.trim() };
      console.log("[AISearchBar] Sending:", JSON.stringify(payload));
      const res = await apiClient.post<SearchResponse>(
        "/api/menu/search",
        payload,
      );
      console.log("[AISearchBar] Received:", res.data.items.length, "items");
      setResults(res.data);
    } catch {
      setError("Search failed - please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  function handleChipClick(chip: string) {
    setQuery(chip);
    doSearch(chip);
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setError(null);
    onClear();
  }

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "14px",
        border: "1.5px solid",
        borderColor: borderColor,
        overflow: "hidden",
      }}
    >
      {/* Gradient accent bar */}
      <div
        style={{
          height: "3px",
          background: "linear-gradient(90deg, #D43B1F, #E8A040)",
        }}
      />

      <div style={{ padding: "24px" }}>
        {/* Header eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>🔍</span>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: textMuted,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Smart Search
          </span>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mb-5">
          <div className="flex gap-2">
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you're craving..."
                style={{
                  width: "100%",
                  padding: "14px 18px 14px 44px",
                  borderRadius: "10px",
                  border: "1.5px solid",
                  borderColor: borderColor,
                  color: "#1A1410",
                  fontSize: "0.95rem",
                  outline: "none",
                  fontFamily: "DM Sans, sans-serif",
                  backgroundColor: "#FAF8F5",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(212,59,31,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {/* Search icon prefix */}
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.1rem",
                  color: textMuted,
                  pointerEvents: "none",
                  lineHeight: 1,
                }}
              >
                ✦
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                padding: "14px 28px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: loading || !query.trim() ? textMuted : accent,
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
                fontFamily: "DM Sans, sans-serif",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!loading && query.trim())
                  e.currentTarget.style.backgroundColor = accentHover;
              }}
              onMouseLeave={(e) => {
                if (!loading && query.trim())
                  e.currentTarget.style.backgroundColor = accent;
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: "14px 16px",
                border: "1.5px solid",
                borderColor: borderColor,
                borderRadius: "10px",
                backgroundColor: "transparent",
                color: textMuted,
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "DM Sans, sans-serif",
                whiteSpace: "nowrap",
                transition: "border-color 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.color = accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.color = textMuted;
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {/* Example chips - idle state */}
        {!results && !loading && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span
              style={{
                fontSize: "0.8rem",
                color: textMuted,
                alignSelf: "center",
                marginRight: "2px",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Try saying:
            </span>
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                style={{
                  padding: "6px 16px",
                  border: "1.5px solid",
                  borderColor: borderColor,
                  borderRadius: "8px",
                  backgroundColor: "#FAF8F5",
                  color: textBody,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontFamily: "DM Sans, sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.color = accent;
                  e.currentTarget.style.backgroundColor = "#FFF5F2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.color = textBody;
                  e.currentTarget.style.backgroundColor = "#FAF8F5";
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "12px",
                  border: "1.5px solid",
                  borderColor: borderColor,
                  padding: "20px",
                  height: "200px",
                }}
              >
                <div
                  style={{
                    height: "14px",
                    backgroundColor: "#F0EBE5",
                    borderRadius: "6px",
                    width: "75%",
                    marginBottom: "12px",
                  }}
                />
                <div
                  style={{
                    height: "12px",
                    backgroundColor: "#F5F0EB",
                    borderRadius: "6px",
                    width: "100%",
                    marginBottom: "8px",
                  }}
                />
                <div
                  style={{
                    height: "12px",
                    backgroundColor: "#F5F0EB",
                    borderRadius: "6px",
                    width: "66%",
                    marginBottom: "16px",
                  }}
                />
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      height: "24px",
                      backgroundColor: "#F0EBE5",
                      borderRadius: "6px",
                      width: "64px",
                    }}
                  />
                  <div
                    style={{
                      height: "36px",
                      backgroundColor: "#F0EBE5",
                      borderRadius: "8px",
                      width: "100px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div
            className="text-center"
            style={{
              padding: "32px 16px",
              backgroundColor: "#FFF5F2",
              borderRadius: "10px",
              border: "1px solid #FED7D0",
            }}
          >
            <p style={{ color: accent, marginBottom: "8px", fontWeight: 500 }}>
              {error}
            </p>
            <button
              onClick={handleClear}
              style={{
                color: accent,
                fontWeight: 600,
                fontSize: "0.875rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                textDecoration: "underline",
              }}
            >
              Browse all items instead
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {results && !loading && (
          <div className="mt-2">
            {/* Relaxed filter note - left-accent card */}
            {results.relaxed_filters && results.relaxed_note && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "14px 18px",
                  backgroundColor: "#FFFBEB",
                  borderRadius: "10px",
                  borderLeft: "4px solid #E8A040",
                  fontSize: "0.875rem",
                  color: "#92400E",
                  lineHeight: 1.5,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                💡 {results.relaxed_note}
              </div>
            )}

            {/* No results */}
            {results.items.length === 0 ? (
              <div className="text-center" style={{ padding: "48px 16px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
                  🤔
                </div>
                <p
                  style={{
                    color: textBody,
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    marginBottom: "4px",
                  }}
                >
                  Nothing matched your search
                </p>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "0.9rem",
                    marginBottom: "20px",
                  }}
                >
                  Try different words or browse the full menu instead
                </p>
                <button
                  onClick={handleClear}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: accent,
                    color: accent,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    backgroundColor: "transparent",
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
                  Browse all items
                </button>
              </div>
            ) : (
              <>
                {/* Result count */}
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: textMuted,
                    marginBottom: "16px",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {results.items.length} result
                  {results.items.length !== 1 ? "s" : ""} found
                </div>

                {/* Thin-results banner: when relaxed and very few items */}

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Thin-results fallback: relaxed + fewer than 5 items */}
                {results.relaxed_filters &&
                  results.items.length > 0 &&
                  results.items.length < 5 && (
                    <div
                      style={{
                        marginTop: "24px",
                        padding: "18px",
                        backgroundColor: "#FFF5F2",
                        borderRadius: "10px",
                        border: "1px solid #FED7D0",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          color: accent,
                          fontWeight: 500,
                          marginBottom: "4px",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        Only {results.items.length} match
                        {results.items.length !== 1 ? "es" : ""} found
                      </p>
                      <p
                        style={{
                          color: textBody,
                          fontSize: "0.85rem",
                          marginBottom: "12px",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        Filters were relaxed but results are still limited. Try
                        a different search.
                      </p>
                      <button
                        onClick={handleClear}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "8px",
                          border: "1.5px solid",
                          borderColor: accent,
                          color: accent,
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          backgroundColor: "transparent",
                          cursor: "pointer",
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
                        Browse full menu
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
