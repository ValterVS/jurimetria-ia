import Header from '../../layouts/Header.jsx';
import ResumoSection from '../../components/jurimetria/ResumoSection.jsx';

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Panorama geral dos processos e análises" />
      <div className="p-8">
        <ResumoSection filtros={{}} />
      </div>
    </>
  );
}
