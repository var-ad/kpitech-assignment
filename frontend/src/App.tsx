import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Admin from './routes/Admin'
import Customer from './routes/Customer'

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <div style={{ fontSize: '4rem' }}>🍽️</div>
      <h1 style={{ fontFamily: 'Sora, sans-serif', color: '#1A1410', margin: 0, fontSize: '1.5rem' }}>Page not found</h1>
      <p style={{ color: '#5C4F42', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>This page doesn't exist.</p>
      <Link to="/" style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#D43B1F', color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>Back to menu</Link>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Customer />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/customer" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
