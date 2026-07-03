import { useState, useRef, useEffect } from "react";
import apiClient from "../api/client";
import { useCart } from "../context/CartContext";

interface SearchItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number | string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  score?: number | null;
}

interface Message {
  from: "bot" | "user";
  text: string;
  results?: SearchItem[];
}

const GREETINGS = [
  "hi",
  "hello",
  "hey",
  "yo",
  "help",
  "what can you do",
  "menu",
];
const FAREWELLS = ["thanks", "thank you", "bye", "goodbye", "ok", "nice"];

function isGreeting(text: string) {
  const t = text.toLowerCase().trim();
  return GREETINGS.some((g) => t === g || t.startsWith(g));
}
function isFarewell(text: string) {
  const t = text.toLowerCase().trim();
  return FAREWELLS.some((f) => t === f || t.startsWith(f));
}

const accent = "#D43B1F";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: 'Hi! What do you want to order today? 😊\n\nTry: "spicy noodles", "light lunch", or "something sweet"',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { addItem } = useCart();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSearch = async (query: string) => {
    addMessage({ from: "user", text: query });
    setInput("");
    setLoading(true);

    if (isGreeting(query)) {
      addMessage({
        from: "bot",
        text: 'Hey! 👋 Tell me what you\'re in the mood for - I\'ll find the best matches from our menu. You can say things like "vegetarian under 200", "grilled chicken", or "light and healthy".',
      });
      setLoading(false);
      return;
    }

    if (isFarewell(query)) {
      addMessage({
        from: "bot",
        text: "Enjoy your meal! 😊 I'll be here if you need anything else.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post("/api/menu/search", {
        query: query.trim(),
      });
      const items: SearchItem[] = res.data.items || [];
      if (items.length === 0) {
        addMessage({
          from: "bot",
          text: "Hmm, I couldn't find anything matching that. Try different words - like a category, cooking method, or flavor. You can also browse the full menu using the tabs above.",
        });
      } else if (items.length <= 3) {
        addMessage({
          from: "bot",
          text: `Here's what I found for "${query}":`,
          results: items,
        });
      } else {
        addMessage({
          from: "bot",
          text: `Top matches for "${query}" - ${items.length} results:`,
          results: items.slice(0, 5),
        });
      }
    } catch {
      addMessage({
        from: "bot",
        text: "Sorry, something went wrong. Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    handleSearch(q);
  };

  const toggle = () => setOpen(!open);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 100,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          backgroundColor: accent,
          color: "#FFFFFF",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(212,59,31,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          transition: "transform 0.2s",
          transform: open ? "rotate(45deg)" : "none",
        }}
      >
        {open ? "+" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="chat-panel"
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            zIndex: 100,
            width: "380px",
            maxWidth: "calc(100vw - 48px)",
            height: "520px",
            maxHeight: "calc(100vh - 140px)",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            border: "1.5px solid #E5DDD3",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1.5px solid #E5DDD3",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#FAF8F5",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                fontSize: "1rem",
              }}
            >
              {"🤖"}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontFamily: "Sora, sans-serif",
                  color: "#1A1410",
                  fontSize: "0.9rem",
                }}
              >
                Order Assistant
              </div>
              <div style={{ fontSize: "0.7rem", color: "#A09080" }}>
                AI-powered &bull; always online
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1.5px solid #E5DDD3",
                backgroundColor: "transparent",
                color: "#A09080",
                cursor: "pointer",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.color = accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5DDD3";
                e.currentTarget.style.color = "#A09080";
              }}
              title="Minimize"
            >
              {"−"}
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{ marginBottom: msg.results ? "8px" : "12px" }}
              >
                {/* Text bubble */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.from === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                      fontFamily: "DM Sans, sans-serif",
                      whiteSpace: "pre-line",
                      ...(msg.from === "user"
                        ? {
                            backgroundColor: accent,
                            color: "#FFFFFF",
                            borderBottomRightRadius: "4px",
                          }
                        : {
                            backgroundColor: "#F5F0EB",
                            color: "#1A1410",
                            borderBottomLeftRadius: "4px",
                          }),
                    }}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Result cards */}
                {msg.results && msg.results.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {msg.results.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "10px",
                          border: "1.5px solid #E5DDD3",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontFamily: "Sora, sans-serif",
                              color: "#1A1410",
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              marginTop: "2px",
                            }}
                          >
                            {item.is_vegetarian && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#1A7A44",
                                  backgroundColor: "#E8F5E9",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
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
                                }}
                              >
                                Spicy
                              </span>
                            )}
                            {item.score != null && item.score > 0 && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#7C3AED",
                                  backgroundColor: "#F3E8FF",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {Math.round(item.score * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontFamily: "Sora, sans-serif",
                            color: accent,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {"₹"}
                          {typeof item.price === "string"
                            ? parseFloat(item.price).toFixed(0)
                            : Number(item.price).toFixed(0)}
                        </div>
                        <button
                          onClick={() => {
                            addItem({
                              menuItemId: item.id,
                              name: item.name,
                              price:
                                typeof item.price === "string"
                                  ? parseFloat(item.price)
                                  : Number(item.price),
                            });
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "1.5px solid",
                            borderColor: accent,
                            backgroundColor: "transparent",
                            color: accent,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "DM Sans, sans-serif",
                            whiteSpace: "nowrap",
                            transition: "all 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = accent;
                            e.currentTarget.style.color = "#FFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                            e.currentTarget.style.color = accent;
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: "4px", padding: "8px 14px" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#D1C9BF",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "12px",
              borderTop: "1.5px solid #E5DDD3",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "Searching..." : "What are you craving?"}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #E5DDD3",
                outline: "none",
                fontSize: "0.85rem",
                fontFamily: "DM Sans, sans-serif",
                backgroundColor: "#FAF8F5",
                color: "#1A1410",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5DDD3")}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: loading || !input.trim() ? "#D1C9BF" : accent,
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "background-color 0.1s",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Mobile: full-screen overlay */}
      <style>{`
        @media (max-width: 480px) {
          .chat-panel {
            bottom: 0 !important; right: 0 !important; left: 0 !important;
            width: 100% !important; max-width: 100% !important;
            height: 100% !important; max-height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
