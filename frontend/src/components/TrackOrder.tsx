import { useState } from 'react'
import apiClient from '../api/client'
import OrderTracker, { STATUS_LABELS, STATUS_BG, parsePrice, type OrderData, Spin, getApiError, formatDateTime } from './OrderTracker'

const accent = '#D43B1F'
const accentHover = '#BA2E14'
const borderColor = '#E5DDD3'
const textBody = '#5C4F42'
const textMuted = '#A09080'

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    const id = orderId.trim()
    if (!id || isNaN(Number(id))) {
      setError('Please enter a valid order ID')
      return
    }
    setLoading(true)
    setError(null)
    setOrder(null)
    try {
      const res = await apiClient.get<OrderData>(`/api/orders/${id}`)
      setOrder(res.data)
    } catch (err: unknown) {
      const status = (err as any)?.response?.status
      if (status === 404) setError('Order not found. Please check the ID and try again.')
      else setError(getApiError(err, 'Failed to look up order'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1.5px solid',
        borderColor: borderColor,
        overflow: 'hidden',
      }}
    >
      {/* Gradient accent bar */}
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, #D43B1F, #E8A040)',
        }}
      />

      <div style={{ padding: '24px' }}>
        {/* Title */}
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            fontFamily: 'Sora, sans-serif',
            color: '#1A1410',
            margin: '0 0 16px',
          }}
        >
          📋 Track Your Order
        </h3>

        {/* Search input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="number"
            placeholder="Enter order ID"
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup()
            }}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1.5px solid',
              borderColor: borderColor,
              color: '#1A1410',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
              backgroundColor: '#FAF8F5',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,59,31,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = borderColor;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleLookup}
            disabled={loading || !orderId.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: loading || !orderId.trim() ? textMuted : accent,
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: loading || !orderId.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (!loading && orderId.trim()) e.currentTarget.style.backgroundColor = accentHover;
            }}
            onMouseLeave={(e) => {
              if (!loading && orderId.trim()) e.currentTarget.style.backgroundColor = accent;
            }}
          >
            {loading ? <><Spin /> Searching</> : 'Track'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFF5F2',
              border: '1px solid #FED7D0',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: accent,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="animate-pulse" style={{ padding: '20px 0' }}>
            <div style={{ height: '14px', backgroundColor: '#F0EBE5', borderRadius: '6px', width: '60%', marginBottom: '16px' }} />
            <div style={{ height: '32px', backgroundColor: '#F0EBE5', borderRadius: '8px', width: '100%', marginBottom: '12px' }} />
            <div style={{ height: '12px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '80%', marginBottom: '8px' }} />
            <div style={{ height: '12px', backgroundColor: '#F5F0EB', borderRadius: '6px', width: '50%' }} />
          </div>
        )}

        {/* Order details */}
        {order && !loading && (
          <div
            style={{
              borderRadius: '12px',
              border: '1.5px solid',
              borderColor: borderColor,
              overflow: 'hidden',
            }}
          >
            {/* Order header */}
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1.5px solid',
                borderColor: borderColor,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FAF8F5',
              }}
            >
              <h4
                style={{
                  fontWeight: 700,
                  fontFamily: 'Sora, sans-serif',
                  color: '#1A1410',
                  fontSize: '1rem',
                  margin: 0,
                }}
              >
                Order #{order.id}
              </h4>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: (() => {
                    const bg = STATUS_BG[order.status];
                    return bg ? bg.split(' ')[0] : '#F5F0EB';
                  })(),
                  color: (() => {
                    const bg = STATUS_BG[order.status];
                    return bg ? bg.split(' ')[1] : '#5C4F42';
                  })(),
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>

            <div style={{ padding: '8px 18px 0' }}>
              <p style={{ fontSize: '0.75rem', color: textMuted, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                Placed at {formatDateTime(order.created_at)}
              </p>

              <OrderTracker currentStatus={order.status} />

              {/* Items */}
              <div style={{ borderTop: '1px solid', borderColor: borderColor, paddingTop: '12px', marginTop: '4px' }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #F0EBE5',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#1A1410', fontFamily: 'DM Sans, sans-serif' }}>
                      {item.name}{' '}
                      <span style={{ color: textMuted }}>×{item.quantity}</span>
                    </span>
                    <span style={{ fontWeight: 600, color: accent, fontFamily: 'Sora, sans-serif' }}>
                      ₹{(parsePrice(item.unit_price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0 8px',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: 'Sora, sans-serif',
                    color: '#1A1410',
                    fontSize: '1rem',
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: 'Sora, sans-serif',
                    color: accent,
                    fontSize: '1.125rem',
                  }}
                >
                  ₹{parsePrice(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Track another */}
            <div style={{ padding: '8px 18px 16px' }}>
              <button
                onClick={() => {
                  setOrder(null)
                  setOrderId('')
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: borderColor,
                  backgroundColor: 'transparent',
                  color: textBody,
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.color = accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.color = textBody;
                }}
              >
                Track Another Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
