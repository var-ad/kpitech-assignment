export const STATUS_STEPS = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up']

export const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Picked Up',
}

/** Badge background/text for each status */
export const STATUS_BG: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  picked_up: 'bg-gray-100 text-gray-800',
}

interface OrderTrackerProps {
  currentStatus: string
}

/** Chili-red for completed, warm tan for incomplete */
const doneColor = '#D43B1F'
const doneText = '#FFFFFF'
const notDoneBg = '#EDE7DF'
const notDoneText = '#A09080'
const currentRing = 'rgba(212, 59, 31, 0.3)'

export default function OrderTracker({ currentStatus }: OrderTrackerProps) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus)

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {STATUS_STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIdx
          const isCurrent = idx === currentIdx

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx < STATUS_STEPS.length - 1 ? 1 : undefined, minWidth: 0 }}>
              {/* Circle + label column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    fontFamily: 'Sora, sans-serif',
                    backgroundColor: isCompleted ? doneColor : notDoneBg,
                    color: isCompleted ? doneText : notDoneText,
                    boxShadow: isCurrent ? `0 0 0 3px ${currentRing}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    marginTop: '6px',
                    fontWeight: isCompleted && isCurrent ? 600 : 500,
                    fontFamily: 'DM Sans, sans-serif',
                    color: isCompleted ? '#1A1410' : notDoneText,
                    textAlign: 'center',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    margin: '0 8px',
                    marginBottom: '20px', // align with circle centers
                    backgroundColor: idx < currentIdx ? doneColor : notDoneBg,
                    transition: 'background-color 0.2s ease',
                    borderRadius: '1px',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Parse a Decimal value returned as string from the API */
export function parsePrice(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v
}

/** Tiny spinning indicator */
export function Spin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  )
}

/** Format ISO datetime for display */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** Extract API error detail or return fallback */
export function getApiError(err: unknown, fallback: string): string {
  const detail = (err as any)?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export interface OrderItemData {
  id: number
  menu_item_id: number
  name: string
  quantity: number
  unit_price: string | number
}

export interface OrderData {
  id: number
  status: string
  total_amount: string | number
  items: OrderItemData[]
  created_at: string
  updated_at: string
}
