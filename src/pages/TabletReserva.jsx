import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function TabletReserva() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [horarioLimiteApp, setHorarioLimiteApp] = useState('09:30'); 
  const [selecionado, setSelecionado] = useState(null); 
  const [pin, setPin] = useState(""); 

  useEffect(() => {
    carregarDados();
    carregarConfiguracoesEVerificarHorario();

    // Reduzi para atualizar sozinho a cada 30 segundos
    const intervalo = setInterval(() => {
      carregarConfiguracoesEVerificarHorario();
    }, 30000); 

    return () => clearInterval(intervalo);
  }, []);

  const carregarConfiguracoesEVerificarHorario = async () => {
    const { data, error } = await supabase.from('configuracoes').select('horario_limite').eq('id', 1).single();
    
    if (error) {
      console.error("Erro ao buscar a hora limite. Verifique se criou a coluna no banco!", error);
      return;
    }

    const horaTexto = data?.horario_limite || '09:30';
    setHorarioLimiteApp(horaTexto);

    const agora = new Date();
    const limite = new Date();
    const [hora, minuto] = horaTexto.split(':');
    
    // Zera os segundos para a comparação ficar exata
    limite.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0); 
    
    if (agora > limite) {
      setBloqueado(true);
      setSelecionado(null); // Se o funcionário estiver com a tela de PIN aberta na hora que bater o limite, ela fecha na cara dele!
    } else {
      setBloqueado(false); 
    }
  };

  const carregarDados = async () => {
    const hoje = new Date().toISOString().split('T')[0];

    const { data: reservasHoje } = await supabase
      .from('reservas')
      .select('funcionario_id')
      .eq('data_reserva', hoje);

    const idsReservados = reservasHoje?.map(r => r.funcionario_id) || [];

    const { data: lista, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('ativo', true)
      .not('id', 'in', `(${idsReservados.join(',') || '00000000-0000-0000-0000-000000000000'})`)
      .order('nome', { ascending: true });

    if (!error) setFuncionarios(lista);
  };

  const handleConfirmar = async () => {
    // 1. CHECAGEM DE SEGURANÇA FINAL: Verifica o horário exato na hora do clique
    const agora = new Date();
    const limite = new Date();
    const [hora, minuto] = horarioLimiteApp.split(':');
    limite.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);

    if (agora > limite) {
      setBloqueado(true);
      setSelecionado(null);
      setPin("");
      toast.error(`Reserva bloqueada! O limite era até as ${horarioLimiteApp}.`, { duration: 5000 });
      return; // Trava a função aqui e não deixa reservar
    }

    // 2. Se a hora estiver ok, confere a senha
    if (pin === selecionado.pin) {
      const { error } = await supabase
        .from('reservas')
        .insert([{ funcionario_id: selecionado.id }]);

      if (error) {
        toast.error("Erro ao reservar. Tente novamente.");
      } else {
        toast.success(`Marmita reservada com sucesso para ${selecionado.nome}!`, { duration: 4000 });
        setSelecionado(null);
        setPin("");
        carregarDados(); 
      }
    } else {
      toast.error("PIN incorreto! Tente novamente.");
      setPin("");
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      
      {/* OVERLAY DE BLOQUEIO (EFEITO BLUR) */}
      {bloqueado && (
        <div style={{ 
          position: 'absolute', 
          top: -20, left: -20, right: -20, bottom: -20, 
          backgroundColor: 'rgba(0, 0, 0, 0.1)', 
          backdropFilter: 'blur(10px)', 
          WebkitBackdropFilter: 'blur(10px)', 
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '16px'
        }}>
           <div style={{ 
             padding: '50px 40px', 
             backgroundColor: 'var(--bg-card)', 
             borderRadius: '24px', 
             boxShadow: '0 15px 35px rgba(0,0,0,0.2)', 
             textAlign: 'center', 
             maxWidth: '90%',
             border: '1px solid var(--border-color)'
           }}>
              <span style={{ fontSize: '4rem', display: 'block', marginBottom: '20px' }}>⏰</span>
              <h1 style={{ color: 'var(--danger-text)', fontSize: '2.2rem', margin: 0, marginBottom: '10px' }}>
                Reservas Encerradas
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                O horário limite ({horarioLimiteApp}) para pedidos de hoje já passou.
              </p>
           </div>
        </div>
      )}

      {/* Grid Responsivo de Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
        gap: '20px',
        pointerEvents: bloqueado ? 'none' : 'auto', 
        userSelect: bloqueado ? 'none' : 'auto'
      }}>
        {funcionarios.map((f) => (
          <button
            key={f.id}
            style={{
              padding: '25px', 
              fontSize: '1.1rem',
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px',
              cursor: 'pointer', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              fontWeight: 'bold', 
              color: 'var(--text-main)', 
              transition: 'all 0.2s',
              textAlign: 'center',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '15px'
            }}
            onMouseOver={(e) => { 
              if(!bloqueado) {
                e.currentTarget.style.transform = 'translateY(-3px)'; 
                e.currentTarget.style.boxShadow = '0 6px 10px rgba(0,0,0,0.1)'; 
                e.currentTarget.style.borderColor = 'var(--accent-main)'; 
              }
            }}
            onMouseOut={(e) => { 
              if(!bloqueado) {
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; 
                e.currentTarget.style.borderColor = 'var(--border-color)'; 
              }
            }}
            onClick={() => setSelecionado(f)}
          >
            <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--table-header)', borderRadius: '50%', color: 'var(--accent-main)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>
              {f.nome.charAt(0).toUpperCase()}
            </div>
            <div style={{ wordBreak: 'break-word' }}>{f.nome}</div>
          </button>
        ))}
      </div>

      {/* Modal de PIN Centralizado */}
      {selecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Olá, {selecionado.nome}!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem' }}>Digite seu PIN para confirmar:</p>
            
            <div style={{ fontSize: '3rem', height: '60px', marginBottom: '30px', letterSpacing: '15px', color: 'var(--accent-main)', fontWeight: 'bold' }}>
              {"*".repeat(pin.length) || "0000"}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map((btn) => (
                <button 
                  key={btn} 
                  style={{
                    padding: '20px', 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    borderRadius: '12px', 
                    border: btn === "OK" ? 'none' : '2px solid var(--border-color)',
                    backgroundColor: btn === "OK" ? 'var(--accent-main)' : (btn === "C" ? '#ef4444' : 'var(--bg-body)'),
                    color: (btn === "OK" || btn === "C") ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer', 
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => {
                    if (btn === "C") setPin("");
                    else if (btn === "OK") handleConfirmar();
                    else if (pin.length < 6) setPin(pin + btn);
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
            
            <button 
              style={{ marginTop: '30px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }} 
              onClick={() => { setSelecionado(null); setPin(""); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}