import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { makeApi } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL

export function useApi() {
  const { authFetch, authFetchRaw } = useAuth()
  return useMemo(() => makeApi(authFetch, authFetchRaw), [authFetch, authFetchRaw])
  
}