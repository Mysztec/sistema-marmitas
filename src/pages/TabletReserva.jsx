import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function TabletReserva() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [selecionado, setSelecionado] = useState(null); 
  const [pin, setPin] = useState(""); 

  useEffect(() => {
    verificarHorario();
    carregarDados();
  }, []);

  const verificarHorario = () => {
    const agora = new Date();
    const limite = new Date();
    limite.setHours(17, 30, 0); 
    if (agora > limite) setBloqueado(true);
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
        carregarDados(); // Recarrega para sumir o card
      }
    } else {
      toast.error("PIN incorreto! Tente novamente.");
      setPin("");
    }
  };

  if (bloqueado) {
    return (
      <div style={{ padding: '30px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--danger-text)', fontSize: '1.8rem' }}>Reservas encerradas por hoje. (Limite: 09:30)</h1>
      </div>
    );
  }

  return (
    <div>
      {/* Grid Responsivo de Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
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
              e.currentTarget.style.transform = 'translateY(-3px)'; 
              e.currentTarget.style.boxShadow = '0 6px 10px rgba(0,0,0,0.1)'; 
              e.currentTarget.style.borderColor = 'var(--accent-main)'; 
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.transform = 'translateY(0)'; 
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; 
              e.currentTarget.style.borderColor = 'var(--border-color)'; 
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