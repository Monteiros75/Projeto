import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { nucleoTemContaBancaria } from '../lib/contaBancaria'

const primaryNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documentos', label: 'Documentos', icon: FolderOpen },
  { to: '/folha-caixa', label: 'Folha de Caixa', icon: FileText },
  { to: '/folha-bancaria', label: 'Folha Bancária', icon: Building2 },
  { to: '/fecho-mensal', label: 'Fecho Mensal', icon: CheckSquare },
]

const secondaryNavItems = [
  { to: '/eventos', label: 'Orçamento de Eventos', icon: Calendar },
  { to: '/planos', label: 'PAO e Relatório', icon: ClipboardList, title: 'Plano de Atividades e Orçamento · Relatório Anual de Contas' },
  { to: '/ajuda', label: 'Ajuda', icon: HelpCircle },
  { to: '/configuracoes/perfil', label: 'Perfil', icon: Settings },
]

function Layout() {
  const { user, nucleoProfile, logout, onboardingRequired } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)
  const visiblePrimaryNav = primaryNavItems.filter(
    (item) => item.to !== '/folha-bancaria' || temContaBancaria,
  )

  return (
    <div className="flex h-screen bg-[#F7F7F7]">
      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-[#E5E7EB] bg-white p-2 lg:hidden print:hidden"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-[#6B7280]" />
        ) : (
          <Menu className="h-5 w-5 text-[#6B7280]" />
        )}
      </button>

      {sidebarOpen ? (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-[#E5E7EB] bg-white transition-transform duration-300 lg:static print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[#E5E7EB] p-6">
          <h1 className="text-[20px] font-medium text-[#111827]">Tesouraria Estudantil</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {onboardingRequired ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-[#EFF6FF] px-3 py-2 text-[13px] leading-relaxed text-[#1E40AF]">
                Completa a configuração inicial para começar a registar movimentos.
              </p>
              <div className="space-y-1">
                {secondaryNavItems
                  .filter((item) => item.to === '/configuracoes/perfil' || item.to === '/ajuda')
                  .map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                            isActive
                              ? 'bg-[#1F6FEB] text-white'
                              : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                          }`
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[14px]">{item.label}</span>
                      </NavLink>
                    )
                  })}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {visiblePrimaryNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                          isActive
                            ? 'bg-[#1F6FEB] text-white'
                            : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                        }`
                      }
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[14px]">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>

              <div className="mt-8 border-t border-[#E5E7EB] pt-4">
                <div className="space-y-1">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={item.title}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                            isActive
                              ? 'bg-[#1F6FEB] text-white'
                              : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                          }`
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[14px]">{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-[#E5E7EB] p-4">
          <p className="truncate text-[12px] text-[#6B7280]">
            {nucleoProfile?.nomeNucleo || user?.email || 'Sem utilizador'}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-left text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 print:overflow-visible print:pt-0">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
