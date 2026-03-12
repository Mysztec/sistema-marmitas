import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Retirada() {
  const [reservasHoje, setReservasHoje] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Obtém a data de hoje no formato YYYY-MM-DD considerando o fuso local
  const getHoje = () => {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  useEffect(() => {
    carregarReservas();
  }, []);

  const carregarReservas = async () => {
    const hoje = getHoje();

    const { data, error } = await supabase
      .from('reservas')
      .select(`
        id,
        retirou,
        funcionarios ( nome )
      `)
      .eq('data_reserva', hoje)
      // Ordena para que os pendentes fiquem no topo
      .order('retirou', { ascending: true });

    if (error) {
      console.error("Erro ao carregar reservas:", error);
    } else {
      // Ordena alfabeticamente os que têm o mesmo status
      const dadosOrdenados = data.sort((a, b) => {
        if (a.retirou === b.retirou) {
          return a.funcionarios.nome.localeCompare(b.funcionarios.nome);
        }
        return 0;
      });
      setReservasHoje(dadosOrdenados);
    }
    setCarregando(false);
  };

  const confirmarEntrega = async (idReserva) => {
    // Atualiza no banco de dados
    const { error } = await supabase
      .from('reservas')
      .update({ retirou: true })
      .eq('id', idReserva);

    if (error) {
      alert("Erro ao confirmar entrega. Tente novamente.");
    } else {
      // Atualiza o ecrã instantaneamente sem precisar de recarregar a página
      setReservasHoje(reservasHoje.map(reserva => 
        reserva.id === idReserva ? { ...reserva, retirou: true } : reserva
      ));
    }
  };

  const desfazerEntrega = async (idReserva) => {
    // Caso o responsável clique sem querer, pode desfazer
    const { error } = await supabase
      .from('reservas')
      .update({ retirou: false })
      .eq('id', idReserva);

    if (!error) {
      setReservasHoje(reservasHoje.map(reserva => 
        reserva.id === idReserva ? { ...reserva, retirou: false } : reserva
      ));
    }
  };

  if (carregando) {
    return <div style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)', padding: '100px 0' }}>Carregando lista de hoje...</div>;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', padding: '30px' }}>
      <p style={{ color: 'var(--accent-main)', fontSize: '1.1rem', marginBottom: '30px', fontWeight: 'bold' }}>
        📅 Data: {new Date().toLocaleDateString('pt-BR')}
      </p>

      {reservasHoje.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <span style={{ fontSize: '3rem' }}>🍽️</span>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '10px' }}>
            Ainda não há reservas para o dia de hoje.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '18px', color: 'var(--text-main)', fontSize: '1rem' }}>Funcionário</th>
                <th style={{ padding: '18px', color: 'var(--text-main)', fontSize: '1rem' }}>Estado</th>
                <th style={{ padding: '18px', color: 'var(--text-main)', fontSize: '1rem' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {reservasHoje.map((reserva) => (
                <tr 
                  key={reserva.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    backgroundColor: reserva.retirou ? 'var(--bg-body)' : 'transparent', 
                    transition: 'background-color 0.2s' 
                  }}
                >
                  <td style={{ padding: '18px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--table-header)', borderRadius: '50%', color: 'var(--accent-main)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                      {reserva.funcionarios?.nome.charAt(0).toUpperCase()}
                    </div>
                    {reserva.funcionarios?.nome}
                  </td>
                  <td style={{ padding: '18px' }}>
                    {reserva.retirou ? (
                      <span style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ✅ Entregue
                      </span>
                    ) : (
                      <span style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ⏳ Pendente
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '18px' }}>
                    {!reserva.retirou ? (
                      <button 
                        style={{ padding: '12px 24px', backgroundColor: 'var(--accent-main)', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: '100%', maxWidth: '200px' }} 
                        onClick={() => confirmarEntrega(reserva.id)}
                      >
                        Confirmar Entrega
                      </button>
                    ) : (
                      <button 
                        style={{ padding: '10px 20px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', width: '100%', maxWidth: '200px' }} 
                        onClick={() => desfazerEntrega(reserva.id)}
                      >
                        Desfazer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}