import { NavLink } from 'react-router-dom'
import { Wrench, LayoutDashboard, ArrowLeftRight, Users, Tag, BarChart2, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ClipboardList, ShieldCheck } from 'lucide-react'

const links = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/ferramentas',  icon: Wrench,           label: 'Ferramentas' },
  { to: '/emprestimos',  icon: ArrowLeftRight,   label: 'Empréstimos' },
  { to: '/responsaveis', icon: Users,            label: 'Responsáveis'},
  { to: '/categorias',   icon: Tag,              label: 'Categorias'  },
  { to: '/relatorios',   icon: BarChart2,        label: 'Relatórios'  },
  { to: '/solicitacoes', icon: ClipboardList, label: 'Solicitações' },
  { to: '/manutencao',   icon: Wrench,          label: 'Manutenção'   },
]

export default function Sidebar() {
  const { usuario, logout, isAdmin } = useAuth()

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 border-r border-iron-800/60 bg-iron-950/80 backdrop-blur-md">
      <div className="px-5 py-6 border-b border-iron-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Wrench size={16} className="text-iron-950" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display text-iron-100 leading-tight text-lg">ToolVault</p>
            <p className="text-[10px] text-iron-500 uppercase tracking-widest">Gestão de Ferramentas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}        
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/usuarios"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Shield size={16} strokeWidth={1.75} />
            Usuários
          </NavLink>
        )}

        {(isAdmin || usuario?.perfil === 'encarregado') && (
          <NavLink
             to="/aprovacoes"
             className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
             <ShieldCheck size={16} strokeWidth={1.75} />
             Aprovações
           </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-iron-800/60 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-iron-700 flex items-center justify-center text-xs font-medium text-iron-300">
            {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-iron-300 truncate">{usuario?.nome}</p>
            <p className="text-[10px] text-iron-600 capitalize">{usuario?.perfil}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-link w-full text-iron-500 hover:text-red-400 hover:bg-red-900/20"
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </aside>
  )
}
