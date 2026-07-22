import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const navItems = [{ to: '/concelho', label: 'Núcleos atribuídos', icon: LayoutDashboard }]

function ConselhoLayout() {
  const { user, concelhoProfile, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#F7F7F7]">
      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-[#E5E7EB] bg-white p-2 lg:hidden"
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-[#E5E7EB] bg-white transition-transform duration-300 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[#E5E7EB] p-6">
          <h1 className="text-[20px] font-medium text-[#111827]">Concelho Fiscal</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      isActive ? 'bg-[#1F6FEB] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[14px]">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="border-t border-[#E5E7EB] p-4">
          <p className="truncate text-[12px] text-[#6B7280]">
            {concelhoProfile?.nome || user?.email || 'Sem utilizador'}
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

      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}

export default ConselhoLayout
