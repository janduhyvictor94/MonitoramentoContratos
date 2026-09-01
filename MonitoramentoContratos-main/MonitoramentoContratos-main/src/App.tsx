import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/components/pages/Dashboard'
import Patients from '@/components/pages/Patients'
import Folders from '@/components/pages/Folders'
import Contracts from '@/components/pages/Contracts'
import History from '@/components/pages/History'
import Variables from '@/components/pages/Variables'
import Settings from '@/components/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Patients />} />
          <Route path="/pastas" element={<Folders />} />
          <Route path="/pastas/:id" element={<Folders />} />
          <Route path="/contratos" element={<Contracts />} />
          <Route path="/contratos/:id" element={<Contracts />} />
          <Route path="/historico" element={<History />} />
          <Route path="/variaveis" element={<Variables />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
