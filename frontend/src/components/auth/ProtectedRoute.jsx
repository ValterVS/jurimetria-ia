import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LoadingState from '../ui/LoadingState.jsx';

export default function ProtectedRoute() {
  const { autenticado, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return <LoadingState label="Verificando sessão..." />;
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
