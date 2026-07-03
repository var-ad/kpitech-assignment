import { useState } from "react";
import AISearchBar from "../components/AISearchBar";
import CartDrawer from "../components/CartDrawer";
import ChatBot from "../components/ChatBot";
import MenuBrowser from "../components/MenuBrowser";
import TrackOrder from "../components/TrackOrder";
import { useCart } from "../context/CartContext";

export default function Customer() {
  const [cartOpen, setCartOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const { items } = useCart();

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0EB" }}>
      {/* Chili-red accent bar */}
      <div className="h-[3px]" style={{ backgroundColor: "#D43B1F" }} />

      {/* Top bar */}
      <header
        className="bg-white sticky top-0 z-30"
        style={{ borderBottom: "1px solid #E5DDD3" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "Sora, sans-serif", color: "#1A1410" }}
          >
            Varad's Kitchen
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTrackOpen(!trackOpen)}
              className="text-sm font-medium transition-colors"
              style={{ color: "#5C4F42" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#D43B1F")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#5C4F42")}
            >
              📋 Track Order
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
              style={{ backgroundColor: "#D43B1F" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#BA2E14")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#D43B1F")
              }
            >
              <span>🛒 Cart</span>
              {itemCount > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#1A1410", color: "#FFFFFF" }}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* View toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setShowSearch(false)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: !showSearch ? "#D43B1F" : "transparent",
              color: !showSearch ? "#FFFFFF" : "#5C4F42",
              border: "1.5px solid",
              borderColor: !showSearch ? "#D43B1F" : "#E5DDD3",
              fontFamily: "DM Sans, sans-serif",
            }}
            onMouseOver={(e) => {
              if (showSearch) {
                e.currentTarget.style.borderColor = "#D43B1F";
                e.currentTarget.style.color = "#D43B1F";
              }
            }}
            onMouseOut={(e) => {
              if (showSearch) {
                e.currentTarget.style.borderColor = "#E5DDD3";
                e.currentTarget.style.color = "#5C4F42";
              }
            }}
          >
            Browse Menu
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: showSearch ? "#D43B1F" : "transparent",
              color: showSearch ? "#FFFFFF" : "#5C4F42",
              border: "1.5px solid",
              borderColor: showSearch ? "#D43B1F" : "#E5DDD3",
              fontFamily: "DM Sans, sans-serif",
            }}
            onMouseOver={(e) => {
              if (!showSearch) {
                e.currentTarget.style.borderColor = "#D43B1F";
                e.currentTarget.style.color = "#D43B1F";
              }
            }}
            onMouseOut={(e) => {
              if (!showSearch) {
                e.currentTarget.style.borderColor = "#E5DDD3";
                e.currentTarget.style.color = "#5C4F42";
              }
            }}
          >
            🔍 AI Search
          </button>
        </div>

        {/* Content */}
        {showSearch ? (
          <AISearchBar onClear={() => setShowSearch(false)} />
        ) : (
          <MenuBrowser />
        )}

        {/* Track Order section */}
        {trackOpen && (
          <div className="mt-8 pt-8" style={{ borderTop: "1px solid #E5DDD3" }}>
            <TrackOrder />
          </div>
        )}
      </main>

      {/* Cart drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* AI ChatBot - floating bottom-right */}
      <ChatBot />
    </div>
  );
}
