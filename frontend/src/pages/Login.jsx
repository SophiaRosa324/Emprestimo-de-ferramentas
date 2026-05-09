import { useState } from 'react'
import { Wrench, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, registrar, loading } = useAuth()
  const [tab, setTab]         = useState('login') // 'login' | 'registrar'
  const [nome, setNome]       = useState('')
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [showSenha, setShowSenha] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await login(email, senha)
      toast.success('Bem-vindo!')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRegistrar = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return toast.error('Informe seu nome.')
    if (senha.length < 6) return toast.error('Senha deve ter ao menos 6 caracteres.')
    try {
      await registrar(nome, email, senha)
      toast.success('Conta criada! Faça login.')
      setTab('login')
      setNome('')
      setSenha('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
            <Wrench size={26} className="text-iron-950" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl text-iron-100">ToolVault</h1>
          <p className="text-iron-500 text-sm mt-1">Gestão de Ferramentas</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-2xl shadow-black/40">
          {/* Tabs */}
          <div className="flex gap-1 bg-iron-800/60 rounded-xl p-1 mb-6">
            {[['login', 'Entrar'], ['registrar', 'Criar conta']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTab(val)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === val ? 'bg-amber-500 text-iron-950' : 'text-iron-400 hover:text-iron-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleRegistrar} className="space-y-4">
            {tab === 'registrar' && (
              <div>
                <label className="label">Nome completo</label>
                <input
                  className="input"
                  placeholder="João Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={tab === 'login'}
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showSenha ? 'text' : 'password'}
                  placeholder={tab === 'registrar' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-iron-500 hover:text-iron-300 transition-colors"
                >
                  {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 py-2.5"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-iron-950/30 border-t-iron-950 rounded-full animate-spin" />
              ) : tab === 'login' ? (
                <><LogIn size={15} /> Entrar</>
              ) : (
                <><UserPlus size={15} /> Criar conta</>
              )}
            </button>
          </form>

          {tab === 'login' && (
            <p className="text-center text-xs text-iron-600 mt-4">
              Admin padrão: <span className="text-iron-500 font-mono">admin@toolvault.com</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
