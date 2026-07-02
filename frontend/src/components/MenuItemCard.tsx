import { useState, type CSSProperties } from 'react'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import MenuItemDetail from './MenuItemDetail'

export interface MenuItemData {
  id: number
  name: string
  description: string | null
  category: string
  price: number | string
  is_vegetarian: boolean
  is_spicy: boolean
  available: boolean
  score?: number | null
}

const cardStyle: CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #E5DDD3',
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  overflow: 'hidden',
}

export default function MenuItemCard({ item }: { item: MenuItemData }) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [detailOpen, setDetailOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const price = Number(item.price)

  return (
    <>
      <div
        style={{
          ...cardStyle,
          ...(hover ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            borderColor: '#D43B1F',
          } : {}),
        }}
        onClick={() => setDetailOpen(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Left accent on hover */}
        {hover && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              backgroundColor: '#D43B1F',
              borderTopLeftRadius: '12px',
              borderBottomLeftRadius: '12px',
            }}
          />
        )}

        {/* Tags */}
        <div className="flex gap-2 mb-2.5 flex-wrap">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: '6px',
              backgroundColor: item.is_vegetarian ? '#E8F5E9' : '#FFEBEE',
              color: item.is_vegetarian ? '#1A7A44' : '#C62828',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.is_vegetarian ? '#1A7A44' : '#C62828',
                display: 'inline-block',
              }}
            />
            {item.is_vegetarian ? 'Veg' : 'Non-Veg'}
          </span>
          {item.is_spicy && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: '#FFF7ED',
                color: '#D97706',
              }}
            >
              Spicy
            </span>
          )}
          {item.score != null && item.score > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: '#F3E8FF',
                color: '#7C3AED',
                marginLeft: 'auto',
              }}
            >
              {Math.round(item.score * 100)}% match
            </span>
          )}
        </div>

        {/* Name */}
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            fontFamily: 'Sora, sans-serif',
            color: '#1A1410',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p
            style={{
              fontSize: '0.875rem',
              color: '#5C4F42',
              marginTop: '6px',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.description}
          </p>
        )}

        {/* Price + cart */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              fontFamily: 'Sora, sans-serif',
              color: '#D43B1F',
              lineHeight: 1,
            }}
          >
            ₹{price.toFixed(2)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              addItem({
                menuItemId: item.id,
                name: item.name,
                price,
              })
              toast(`${item.name} added to cart`, 'success')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D43B1F';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#D43B1F';
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1.5px solid #D43B1F',
              backgroundColor: 'transparent',
              color: '#D43B1F',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>

      {/* Detail modal */}
      {detailOpen && (
        <MenuItemDetail item={item} onClose={() => setDetailOpen(false)} />
      )}
    </>
  )
}
