import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  const usuarioInfo = localStorage.getItem('usuarioLogado');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : { username: 'Erro', perfil: '' };

  // IDENTIFICA SE É O TABLET PARA ATIVAR O MODO KIOSK (SEM MENU LATERAL)
  const isKioskMode = usuario.perfil === 'reserva';

  const fazerLogout = () => {
    localStorage.removeItem('usuarioLogado');
    navigate('/login');
  };

  const NavItem = ({ to, icon, label, allowedPerfil }) => {
    if (allowedPerfil && usuario.perfil !== allowedPerfil && usuario.perfil !== 'admin') return null;
    const isAtivo = location.pathname === to;
    return (
      <button 
        onClick={() => { navigate(to); if(window.innerWidth < 1024) setSidebarOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '15px', width: '100%', padding: '15px 20px', textAlign: 'left',
          backgroundColor: isAtivo ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
          fontSize: '1.1rem', transition: 'background-color 0.2s', marginTop: '10px', fontWeight: isAtivo ? 'bold' : 'normal',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>{icon}</span><span>{label}</span>
      </button>
    );
  };

  const getTitle = () => {
    if (location.pathname === '/') return '🍽️ Reservar Marmita';
    if (location.pathname === '/retirada') return '✅ Controle de Entregas';
    if (location.pathname === '/admin') return '👥 Administração';
    return '';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', position: 'relative' }}>
      
      {/* SIDEBAR - ESCONDIDA TOTALMENTE NO MODO KIOSK */}
      {!isKioskMode && (
        <div className="sidebar no-print" style={{
          backgroundColor: 'var(--bg-sidebar)', color: 'white', width: '280px', flexShrink: 0, padding: '30px',
          position: window.innerWidth < 1024 && sidebarOpen ? 'fixed' : 'relative',
          top: 0, left: 0, bottom: 0, zIndex: 1000,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          display: sidebarOpen ? 'flex' : (window.innerWidth >= 1024 ? 'flex' : 'none'), flexDirection: 'column',
        }}>
          
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Reservar Marmita
          </div>

          <div style={{ flexGrow: 1 }}>
            <NavItem to="/" icon="🍽️" label="Reservar Marmita" allowedPerfil="reserva" />
            <NavItem to="/retirada" icon="✅" label="Controle de Entregas" allowedPerfil="conferencia" />
            <NavItem to="/admin" icon="👥" label="Administração" allowedPerfil="admin" />
          </div>
          
          <div style={{ marginTop: '50px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--accent-main)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
              {usuario.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{usuario.username}</div>
              <div style={{ fontSize: '0.9rem', color: '#b2dfdb' }}>{usuario.perfil}</div>
            </div>
            <button onClick={fazerLogout} style={{ background: 'none', border: 'none', color: '#b2dfdb', cursor: 'pointer', fontSize: '1.2rem' }}>🚪</button>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL DA TELA */}
      <div className="main-content" style={{ flexGrow: 1, backgroundColor: 'var(--bg-body)', padding: '40px', transition: 'padding-left 0.3s', maxWidth: '100%', paddingBottom: '80px' }}>
        
        {/* CABEÇALHO MOBILE (SÓ APARECE SE NÃO FOR KIOSK) */}
        {window.innerWidth < 1024 && !isKioskMode && (
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', backgroundColor: 'var(--bg-card)', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: 'var(--accent-main)', fontSize: '1.8rem', cursor: 'pointer', marginRight: '15px' }}>☰</button>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-main)' }}>{getTitle()}</h1>
          </div>
        )}
        
        {/* CABEÇALHO DESKTOP */}
        {(window.innerWidth >= 1024 && !isKioskMode) && (
          <h1 className="no-print" style={{ fontSize: '2rem', marginBottom: '40px', color: 'var(--text-main)' }}>{getTitle()}</h1>
        )}
        
        {children}
      </div>

      {/* NOME DA EMPRESA FIXO NO CANTO INFERIOR DIREITO */}
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '30px', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 'bold', opacity: 0.6, zIndex: 50 }}>
        mysztec industrial
      </div>
    </div>
  );
};

export default MainLayout;