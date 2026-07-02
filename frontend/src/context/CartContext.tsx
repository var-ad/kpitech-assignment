import { createContext, useContext, useReducer, type ReactNode } from 'react'

export interface CartItem {
  menuItemId: number
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { menuItemId: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: number; quantity: number } }
  | { type: 'CLEAR_CART' }

interface CartContextValue {
  items: CartItem[]
  total: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menuItemId: number) => void
  updateQuantity: (menuItemId: number, quantity: number) => void
  clearCart: () => void
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.menuItemId === action.payload.menuItemId,
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.menuItemId === action.payload.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          ),
        }
      }
      return { items: [...state.items, { ...action.payload, quantity: 1 }] }
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(
          (i) => i.menuItemId !== action.payload.menuItemId,
        ),
      }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          items: state.items.filter(
            (i) => i.menuItemId !== action.payload.menuItemId,
          ),
        }
      }
      return {
        items: state.items.map((i) =>
          i.menuItemId === action.payload.menuItemId
            ? { ...i, quantity: action.payload.quantity }
            : i,
        ),
      }
    }
    case 'CLEAR_CART':
      return { items: [] }
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const total = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const value: CartContextValue = {
    items: state.items,
    total,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
    removeItem: (menuItemId) =>
      dispatch({ type: 'REMOVE_ITEM', payload: { menuItemId } }),
    updateQuantity: (menuItemId, quantity) =>
      dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
