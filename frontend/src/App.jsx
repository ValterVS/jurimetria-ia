import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import ProcessosListPage from './pages/Processos/ProcessosListPage.jsx';
import ProcessoFormPage from './pages/Processos/ProcessoFormPage.jsx';
import ProcessoDetalhePage from './pages/Processos/ProcessoDetalhePage.jsx';
import AdicionarSentencaPage from './pages/Decisoes/AdicionarSentencaPage.jsx';
import AdicionarAcordaoPage from './pages/Decisoes/AdicionarAcordaoPage.jsx';
import AnaliseResultadoPage from './pages/Decisoes/AnaliseResultadoPage.jsx';
import JurimetriaPage from './pages/Jurimetria/JurimetriaPage.jsx';
import CadastroGenericoPage from './pages/Cadastros/CadastroGenericoPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/processos" element={<ProcessosListPage />} />
        <Route path="/processos/novo" element={<ProcessoFormPage />} />
        <Route path="/processos/:id" element={<ProcessoDetalhePage />} />
        <Route path="/processos/:id/editar" element={<ProcessoFormPage />} />
        <Route path="/processos/:id/sentencas/nova" element={<AdicionarSentencaPage />} />
        <Route path="/processos/:id/acordaos/novo" element={<AdicionarAcordaoPage />} />

        <Route path="/analises/:id" element={<AnaliseResultadoPage />} />

        <Route path="/jurimetria" element={<JurimetriaPage />} />

        <Route path="/cadastros/:recurso" element={<CadastroGenericoPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
