import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const response = await authApi.login({ email, password })
    if (response.data.success) {
      const { userId, email: userEmail, firstName, lastName, role, accessToken, refreshToken } = response.data.results
      const userData = { userId, email: userEmail, firstName, lastName, role }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))

      setUser(userData)
      return { success: true }
    }
    return { success: false, message: response.data.message }
  }, [])

  const signup = useCallback(async (email, password, firstName, lastName) => {
    const response = await authApi.signup({ email, password, firstName, lastName })
    if (response.data.success) {
      const { userId, email: userEmail, firstName: fName, lastName: lName, role, accessToken, refreshToken } = response.data.results
      const userData = { userId, email: userEmail, firstName: fName, lastName: lName, role }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))

      setUser(userData)
      return { success: true }
    }
    return { success: false, message: response.data.message, errors: response.data.errors }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    }
  }, [])

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
