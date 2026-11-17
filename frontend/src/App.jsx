import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LoginPage from './pages/Auth/LoginPage.jsx';
import CadastroPage from './pages/Auth/CadastroPage.jsx';
import VerificarEmailPage from './pages/Auth/VerificarEmailPage.jsx';
import EsqueciSenhaPage from './pages/Auth/EsqueciSenhaPage.jsx';
import RedefinirSenhaPage from './pages/Auth/RedefinirSenhaPage.jsx';
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
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/verificar-email" element={<VerificarEmailPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
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
      </Route>
    </Routes>
  );
}
