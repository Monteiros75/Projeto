import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ConselhoLayout from './components/ConselhoLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import AjudaPage from './pages/AjudaPage'
import DocumentoModeloPage from './pages/DocumentoModeloPage'
import DocumentosPage from './pages/DocumentosPage'
import DashboardPage from './pages/DashboardPage'
import EventosPage from './pages/EventosPage'
import EventoEditorPage from './pages/EventoEditorPage'
import ExtratoMensalPage from './pages/ExtratoMensalPage'
import FechoMensalPage from './pages/FechoMensalPage'
import FolhaBancariaPage from './pages/FolhaBancariaPage'
import FolhaCaixaPage from './pages/FolhaCaixaPage'
import LoginPage from './pages/LoginPage'
import EsqueciPasswordPage from './pages/EsqueciPasswordPage'
import RecuperarPasswordPage from './pages/RecuperarPasswordPage'
import PlanoEditorPage from './pages/PlanoEditorPage'
import PlanoPrintPage from './pages/PlanoPrintPage'
import PlanosPage from './pages/PlanosPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import RegisterPage from './pages/RegisterPage'
import ConselhoDashboardPage from './pages/ConselhoDashboardPage'
import ConselhoRevisaoPage from './pages/ConselhoRevisaoPage'

/** Catch-all: manda cada sessao para a home do seu proprio papel. */
function RootRedirect() {
  const { principalType } = useAuth()
  return <Navigate to={principalType === 'concelho' ? '/concelho' : '/dashboard'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registo" element={<RegisterPage />} />
      <Route path="/esqueci-password" element={<EsqueciPasswordPage />} />
      <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
      <Route
        path="/planos/:id/imprimir"
        element={
          <ProtectedRoute>
            <PlanoPrintPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="movimentos" element={<Navigate to="/folha-caixa" replace />} />
        <Route path="documentos/modelo/:id" element={<DocumentoModeloPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="folha-caixa" element={<FolhaCaixaPage />} />
        <Route path="folha-bancaria" element={<FolhaBancariaPage />} />
        <Route path="fecho-mensal" element={<FechoMensalPage />} />
        <Route path="extrato-mensal" element={<ExtratoMensalPage />} />
        <Route path="eventos" element={<EventosPage />} />
        <Route path="eventos/:id" element={<EventoEditorPage />} />
        <Route path="planos" element={<PlanosPage />} />
        <Route path="planos/:id" element={<PlanoEditorPage />} />
        <Route path="ajuda" element={<AjudaPage />} />
        <Route path="configuracoes/perfil" element={<ProfileSettingsPage />} />
      </Route>
      <Route
        path="/concelho"
        element={
          <ProtectedRoute allow="concelho">
            <ConselhoLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ConselhoDashboardPage />} />
        <Route path="nucleos/:nucleoId" element={<ConselhoRevisaoPage />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default App
