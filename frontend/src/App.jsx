import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ferramentas from './pages/Ferramentas'
import Emprestimos from './pages/Emprestimos'
import Responsaveis from './pages/Responsaveis'
import Categorias from './pages/Categorias'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'
import Solicitacoes from './pages/Solicitacoes'
import Manutencao from './pages/Manutencao'
import EmpresasManutecao from './pages/EmpresasManutencao'
import FerramentasCompradas from './pages/FerramentasCompradas'
import Igrejas from './pages/Igrejas'
import Extintores from './pages/Extintores'

function AppLayout() {
  const { usuario } = useAuth()
  if (!usuario) return <Login />
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/ferramentas"  element={<Ferramentas />} />
          <Route path="/FerramentasCompradas"  element={<FerramentasCompradas />} />
          <Route path="/emprestimos"  element={<Emprestimos />} />
          <Route path="/responsaveis" element={<Responsaveis />} />
          <Route path="/categorias"   element={<Categorias />} />
          <Route path="/relatorios"   element={<Relatorios />} />
          <Route path="/usuarios"     element={<Usuarios />} />
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/manutencao"   element={<Manutencao />} />
          <Route path="/empresas-manutecao" element={<EmpresasManutecao />} />
          <Route path="/Igrejas"      element={<Igrejas />} />
          <Route path="/Extintores"   element={<Extintores />} /> 
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#3b3a36',
              color: '#e8e7e5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
