import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import apiClient from '../api/client'

interface UserInfo {
  id: number
  name: string
  email: string
  role: string
}

interface AuthContextValue {
  token: string | null
  user: UserInfo | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('admin_token')
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<UserInfo | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ access_token: string }>('/api/auth/login', {
      email,
      password,
    })
    const t = res.data.access_token
    localStorage.setItem('admin_token', t)
    setToken(t)
    // Fetch user info
    try {
      const meRes = await apiClient.get<UserInfo>('/api/auth/me')
      setUser(meRes.data)
    } catch {
      // non-critical
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setUser(null)
  }, [])

  const isAuthenticated = token !== null
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
