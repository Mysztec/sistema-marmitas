import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // IMPORTAÇÃO NOVA
import Login from './pages/Login';
import TabletReserva from './pages/TabletReserva';
import Retirada from './pages/Retirada';
import Admin from './pages/Admin';
import MainLayout from './layouts/MainLayout';

const RotaProtegidaComLayout = ({ children, perfilPermitido }) => {
  const usuarioInfo = localStorage.getItem('usuarioLogado');
  if (!usuarioInfo) return <Navigate to="/login" replace />;
  
  const usuario = JSON.parse(usuarioInfo);
  if (perfilPermitido && usuario.perfil !== perfilPermitido && usuario.perfil !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <BrowserRouter>
      {/* CONFIGURAÇÃO DO POPUP PARA OBEDECER O MODO ESCURO */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            fontSize: '1.1rem',
            padding: '16px',
          },
          success: { iconTheme: { primary: '#2e7d32', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RotaProtegidaComLayout perfilPermitido="reserva"><TabletReserva /></RotaProtegidaComLayout>} />
        <Route path="/retirada" element={<RotaProtegidaComLayout perfilPermitido="conferencia"><Retirada /></RotaProtegidaComLayout>} />
        <Route path="/admin" element={<RotaProtegidaComLayout perfilPermitido="admin"><Admin /></RotaProtegidaComLayout>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;