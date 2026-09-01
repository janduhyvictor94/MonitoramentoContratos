import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/components/pages/Dashboard'
import Patients from '@/components/pages/Patients'
import Folders from '@/components/pages/Folders'
import Contracts from '@/components/pages/Contracts'
import Anamneses from '@/components/pages/Anamneses'
import History from '@/components/pages/History'
import Variables from '@/components/pages/Variables'
import Settings from '@/components/pages/Settings'
import PublicSign from '@/components/pages/PublicSign'
import PublicAnamnese from '@/components/pages/PublicAnamnese'

// Painel administrativo: sidebar + topbar ao redor de todas as rotas internas
function AdminLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas — abertas pelo paciente via link, sem menu do sistema */}
        <Route path="/assinar/:token" element={<PublicSign />} />
        <Route path="/anamnese/:token" element={<PublicAnamnese />} />

        {/* Rotas internas — painel administrativo */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Patients />} />
          <Route path="/pastas" element={<Folders />} />
          <Route path="/pastas/:id" element={<Folders />} />
          <Route path="/contratos" element={<Contracts />} />
          <Route path="/contratos/:id" element={<Contracts />} />
          <Route path="/anamneses" element={<Anamneses />} />
          <Route path="/anamneses/:id" element={<Anamneses />} />
          <Route path="/historico" element={<History />} />
          <Route path="/variaveis" element={<Variables />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
