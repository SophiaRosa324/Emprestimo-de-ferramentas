import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { makeApi } from '../services/api'

export function useApi() {
  const { authFetch, authFetchRaw } = useAuth()
  return useMemo(() => makeApi(authFetch, authFetchRaw), [authFetch, authFetchRaw])
  
}