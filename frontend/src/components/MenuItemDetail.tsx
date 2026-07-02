import { useCart } from '../context/CartContext'
import { parsePrice } from './OrderTracker'
import type { MenuItemData } from './MenuItemCard'

interface MenuItemDetailProps {
  item: MenuItemData
  onClose: () => void
}

const accent = '#D43B1F'
const accentHover = '#BA2E14'

export default function MenuItemDetail({ item, onClose }: MenuItemDetailProps) {
  const { addItem } = useCart()

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ border: '1.5px solid #E5DDD3' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1.5px solid #E5DDD3' }}
          >
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#1A1410' }}>
              Item Details
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#1A1410' }}>{item.name}</h3>
                {!item.available && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>
                    Currently Unavailable
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-lg"
                  style={{ backgroundColor: item.is_vegetarian ? '#E8F5E9' : '#FFEBEE', color: item.is_vegetarian ? '#1A7A44' : '#C62828' }}
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.is_vegetarian ? '#1A7A44' : '#C62828' }} />
                  {item.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                </span>
                {item.is_spicy && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-lg" style={{ backgroundColor: '#FFF7ED', color: '#D97706' }}>
                    Spicy
                  </span>
                )}
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-lg" style={{ backgroundColor: '#F5F0EB', color: '#5C4F42' }}>
                  {item.category}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: accent }}>
              ₹{parsePrice(item.price).toFixed(2)}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: '#5C4F42' }}>Description</h4>
                <p style={{ color: '#5C4F42', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.description}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1.5px solid #E5DDD3' }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1.5px solid #E5DDD3',
                backgroundColor: 'transparent',
                color: '#5C4F42',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Close
            </button>
            {item.available && (
              <button
                onClick={() => {
                  addItem({
                    menuItemId: item.id,
                    name: item.name,
                    price: parsePrice(item.price),
                  })
                  onClose()
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: accent,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accentHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accent; }}
              >
                🛒 Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
