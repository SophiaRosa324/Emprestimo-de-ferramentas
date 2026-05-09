import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const TOKEN_KEY = 'toolvault_token'
const USER_KEY  = 'toolvault_user'

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY))
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  // Enriquece todas as chamadas com o token

  const authFetch = useCallback(async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (res.status === 401) {
    logout()
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erro ${res.status}`)
  }

  if (res.status === 204) return null

  return res.json()
}, [token])

  const authFetchRaw = useCallback(async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (res.status === 401) {
    logout()
    throw new Error('Sessão expirada')
  }

  return res // 👈 NÃO converte pra JSON
}, [token])

  const login = async (email, senha) => {
    setLoading(true)
    try {
      const form = new URLSearchParams({ username: email, password: senha })
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Credenciais inválidas.')
      }
      const data = await res.json()
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
      setToken(data.access_token)
      setUsuario(data.usuario)
      return data.usuario
    } finally {
      setLoading(false)
    }
  }

  const registrar = async (nome, email, senha) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, perfil: 'operador' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Erro ao registrar.')
      }
      return await res.json()
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUsuario(null)
  }

  const isAdmin = usuario?.perfil === 'admin'

  return (
    <AuthContext.Provider value={{ token, usuario, loading, login, registrar, logout, authFetch, authFetchRaw, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}



export const useAuth = () => useContext(AuthContext)
export { AuthContext }