import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function TabletReserva() {
  const [modo, setModo] = useState('reservar'); // 'reservar' ou 'retirar'
  const [listaExibicao, setListaExibicao] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [horarioLimiteApp, setHorarioLimiteApp] = useState('09:30'); 
  const [selecionado, setSelecionado] = useState(null); 
  const [pin, setPin] = useState(""); 

  useEffect(() => {
    carregarDados();
    carregarConfiguracoesEVerificarHorario();

    // Recarrega automaticamente a cada 30 segundos
    const intervalo = setInterval(() => {
      carregarConfiguracoesEVerificarHorario();
      carregarDados();
    }, 30000); 

    return () => clearInterval(intervalo);
  }, [modo]); // Atualiza os dados sempre que trocar a aba

  const carregarConfiguracoesEVerificarHorario = async () => {
    const { data, error } = await supabase.from('configuracoes').select('horario_limite').eq('id', 1).single();
    
    if (error) return;

    const horaTexto = data?.horario_limite || '09:30';
    setHorarioLimiteApp(horaTexto);

    const agora = new Date();
    const limite = new Date();
    const [hora, minuto] = horaTexto.split(':');
    
    limite.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0); 
    
    if (agora > limite) {
      setBloqueado(true);
      // Se passar do horário enquanto a pessoa digita o PIN para reservar, fecha a tela
      if (modo === 'reservar' && selecionado) {
         setSelecionado(null);
      }
    } else {
      setBloqueado(false); 
    }
  };

  const carregarDados = async () => {
    // Pega a data local para evitar fuso horário errado
    const dataLocal = new Date();
    const ano = dataLocal.getFullYear();
    const mes = String(dataLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(dataLocal.getDate()).padStart(2, '0');
    const hoje = `${ano}-${mes}-${dia}`;

    if (modo === 'reservar') {
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

      if (!error) setListaExibicao(lista || []);
      
    } else {
      // MODO RETIRAR
      const { data: reservasHoje, error } = await supabase
        .from('reservas')
        .select(`
          id,
          retirou,
          funcionarios ( id, nome, pin )
        `)
        .eq('data_reserva', hoje)
        .eq('retirou', false);
        
      if (!error && reservasHoje) {
        // Transforma o retorno complexo para ficar igual à lista de funcionários
        const lista = reservasHoje.map(r => ({
          reserva_id: r.id,
          id: r.funcionarios?.id,
          nome: r.funcionarios?.nome,
          pin: r.funcionarios?.pin
        })).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        
        setListaExibicao(lista);
      }
    }
  };

  const handleConfirmar = async () => {
    // Validação de horário APENAS no momento da reserva
    if (modo === 'reservar') {
      const agora = new Date();
      const limite = new Date();
      const [hora, minuto] = horarioLimiteApp.split(':');
      limite.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);

      if (agora > limite) {
        setBloqueado(true);
        setSelecionado(null);
        setPin("");
        toast.error(`Reserva bloqueada! O limite era até as ${horarioLimiteApp}.`);
        return; 
      }
    }

    // Se o PIN estiver correto, decide qual ação tomar
    if (pin === selecionado.pin) {
      if (modo === 'reservar') {
        const { error } = await supabase
          .from('reservas')
          .insert([{ funcionario_id: selecionado.id }]);

        if (error) {
          toast.error("Erro ao reservar. Tente novamente.");
        } else {
          toast.success(`Marmita reservada com sucesso para ${selecionado.nome}!`);
        }
      } else {
        // AÇÃO: CONFIRMAR RETIRADA
        const { error } = await supabase
          .from('reservas')
          .update({ retirou: true })
          .eq('id', selecionado.reserva_id);

        if (error) {
          toast.error("Erro ao confirmar retirada. Tente novamente.");
        } else {
          toast.success(`Retirada confirmada para ${selecionado.nome}! Bom apetite!`);
        }
      }
      
      setSelecionado(null);
      setPin("");
      carregarDados(); 
    } else {
      toast.error("PIN incorreto! Tente novamente.");
      setPin("");
    }
  };

  return (
    <div>
      {/* BOTOES DE NAVEGAÇÃO SUPERIOR */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setModo('reservar'); setSelecionado(null); setPin(""); }}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: 'var(--bg-sidebar)', /* A cor mais escura do seu tema */
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flex: '1',
            maxWidth: '300px',
            opacity: modo === 'reservar' ? 1 : 0.5, /* Deixa o botão inativo mais apagado */
            transform: modo === 'reservar' ? 'scale(1.02)' : 'scale(1)' /* Dá um leve destaque no ativo */
          }}
        >
          🍽️ Fazer Reserva
        </button>
        <button 
          onClick={() => { setModo('retirar'); setSelecionado(null); setPin(""); }}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: 'var(--bg-sidebar)', /* A cor mais escura do seu tema */
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flex: '1',
            maxWidth: '300px',
            opacity: modo === 'retirar' ? 1 : 0.5, /* Deixa o botão inativo mais apagado */
            transform: modo === 'retirar' ? 'scale(1.02)' : 'scale(1)' /* Dá um leve destaque no ativo */
          }}
        >
          ✅ Retirar Marmita
        </button>
      </div>

      <div style={{ position: 'relative', minHeight: '50vh' }}>
        
        {/* OVERLAY DE BLOQUEIO (SÓ APARECE NA ABA DE RESERVA) */}
        {bloqueado && modo === 'reservar' && (
          <div style={{ 
            position: 'absolute', 
            top: -10, left: -10, right: -10, bottom: -10, 
            backgroundColor: 'transparent', /* Remove a cor cinzenta/branca e deixa totalmente transparente */
            backdropFilter: 'blur(8px)', /* Mantém o efeito desfocado nos cartões por trás */
            WebkitBackdropFilter: 'blur(8px)', 
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
               boxShadow: '0 15px 35px rgba(0,0,0,0.3)', 
               textAlign: 'center', 
               maxWidth: '90%',
               border: '2px solid var(--border-color)' /* Destaque subtil com a cor do seu tema */
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

        {/* LISTAGEM DE FUNCIONÁRIOS (RESERVA OU RETIRADA) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '20px',
          pointerEvents: (bloqueado && modo === 'reservar') ? 'none' : 'auto', 
          userSelect: (bloqueado && modo === 'reservar') ? 'none' : 'auto'
        }}>
          {listaExibicao.map((f) => (
            <button
              key={modo === 'reservar' ? f.id : f.reserva_id}
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
                if(!(bloqueado && modo === 'reservar')) {
                  e.currentTarget.style.transform = 'translateY(-3px)'; 
                  e.currentTarget.style.boxShadow = '0 6px 10px rgba(0,0,0,0.1)'; 
                  e.currentTarget.style.borderColor = 'var(--accent-main)'; 
                }
              }}
              onMouseOut={(e) => { 
                if(!(bloqueado && modo === 'reservar')) {
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; 
                  e.currentTarget.style.borderColor = 'var(--border-color)'; 
                }
              }}
              onClick={() => setSelecionado(f)}
            >
              <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--table-header)', borderRadius: '50%', color: 'var(--accent-main)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {f.nome?.charAt(0).toUpperCase()}
              </div>
              <div style={{ wordBreak: 'break-word' }}>{f.nome}</div>
              
              {/* Etiqueta na tela de retirada */}
              {modo === 'retirar' && (
                <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '4px 8px', borderRadius: '12px' }}>Pendente</span>
              )}
            </button>
          ))}

          {/* MENSAGEM QUANDO A LISTA ESTIVER VAZIA */}
          {listaExibicao.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontSize: '1.2rem', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>{modo === 'reservar' ? '🍽️' : '✅'}</span>
              {modo === 'reservar' 
                ? 'Todos já reservaram ou não há funcionários ativos.' 
                : 'Nenhuma marmita pendente para retirada no momento.'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PIN (USADO TANTO PARA RESERVAR QUANTO PARA RETIRAR) */}
      {selecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Olá, {selecionado.nome}!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem' }}>
              {modo === 'reservar' ? 'Digite seu PIN para RESERVAR:' : 'Digite seu PIN para RETIRAR:'}
            </p>
            
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