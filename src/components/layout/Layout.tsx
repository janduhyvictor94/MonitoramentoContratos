import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  ClipboardList,
  Calendar,
  Settings,
  Variable,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/pastas', label: 'Pastas', icon: FolderOpen },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/anamneses', label: 'Anamneses', icon: ClipboardList },
  { to: '/historico', label: 'Histórico', icon: Calendar },
  { to: '/variaveis', label: 'Variáveis', icon: Variable },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitle =
    navItems.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    )?.label ?? 'Instituto Bruna Braga'

  return (
    <div className="flex h-screen overflow-hidden bg-cream-100">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink-950 transition-transform duration-300
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-7 py-8 border-b border-ink-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="luxury-label text-gold-500 mb-1">Instituto</p>
              <p className="heading-serif text-2xl text-cream-50">Bruna Braga</p>
            </div>
            <button
              className="text-ink-400 hover:text-cream-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold-700 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
          <p className="px-3 pb-3 luxury-label text-ink-500">Principal</p>
          {navItems.slice(0, 3).map((item) => (
            <SideNavItem key={item.to} {...item} onNavigate={() => setSidebarOpen(false)} />
          ))}

          <p className="px-3 pb-3 pt-6 luxury-label text-ink-500">Documentos</p>
          {navItems.slice(3, 7).map((item) => (
            <SideNavItem key={item.to} {...item} onNavigate={() => setSidebarOpen(false)} />
          ))}

          <p className="px-3 pb-3 pt-6 luxury-label text-ink-500">Sistema</p>
          {navItems.slice(7).map((item) => (
            <SideNavItem key={item.to} {...item} onNavigate={() => setSidebarOpen(false)} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-ink-800 px-7 py-5">
          <div className="h-px bg-gradient-to-r from-transparent via-gold-700 to-transparent mb-4" />
          <p className="text-xs text-ink-500 text-center tracking-wider uppercase">
            Excelência & Cuidado
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b border-ink-100 bg-cream-50 px-7 shrink-0">
          <button
            className="text-ink-500 hover:text-ink-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="heading-serif text-xl">{pageTitle}</h1>
          <div className="ml-auto h-8 w-px bg-ink-100" />
          <p className="luxury-label text-gold-700 hidden sm:block">Painel Administrativo</p>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function SideNavItem({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3.5 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all duration-200 relative ${
          isActive
            ? 'bg-gold-600/10 text-gold-400'
            : 'text-ink-300 hover:bg-ink-900 hover:text-cream-50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-gold-500 rounded-r" />
          )}
          <Icon size={17} className="shrink-0" />
          <span className="tracking-wide">{label}</span>
        </>
      )}
    </NavLink>
  )
}