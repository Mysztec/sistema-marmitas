import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Admin() {
  const [abaAtiva, setAbaAtiva] = useState('funcionarios');
  const [funcionarios, setFuncionarios] = useState([]);
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [reservas, setReservas] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);

  // ==========================================
  // ESTADOS: FECHAMENTO MENSAL
  // ==========================================
  const [mesFechamento, setMesFechamento] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [precos, setPrecos] = useState({ valor_retirada: 0, valor_falta: 0 });
  const [dadosFechamento, setDadosFechamento] = useState([]);
  const [tipoFechamento, setTipoFechamento] = useState('geral'); // 'geral' ou 'detalhado'
  const [filtroFuncionario, setFiltroFuncionario] = useState('');

  // Toda vez que mudar de aba ou de mês, ele recalcula automaticamente!
  useEffect(() => {
    if (abaAtiva === 'funcionarios') {
      carregarFuncionarios();
    } else if (abaAtiva === 'relatorios') {
      carregarRelatorio();
    } else if (abaAtiva === 'fechamento') {
      gerarFechamento(); // Agora essa função faz tudo sozinha
    }
  }, [abaAtiva, dataFiltro, mesFechamento]);

  // ==========================================
  // FUNÇÕES DE FUNCIONÁRIOS
  // ==========================================
  const carregarFuncionarios = async () => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome', { ascending: true });
    
    if (!error) {
      setFuncionarios(data);
    }
  };

  const cadastrarFuncionario = async (e) => {
    e.preventDefault();
    if (!nome || !pin) {
      toast.error("Preencha nome e PIN!");
      return;
    }

    const { error } = await supabase
      .from('funcionarios')
      .insert([{ nome, pin }]);

    if (error) {
      toast.error("Erro ao cadastrar funcionário.");
    } else {
      setNome('');
      setPin('');
      carregarFuncionarios();
      toast.success("Funcionário cadastrado com sucesso!");
    }
  };

  const alternarStatus = async (id, statusAtual) => {
    await supabase
      .from('funcionarios')
      .update({ ativo: !statusAtual })
      .eq('id', id);
    
    carregarFuncionarios();
    toast.success(statusAtual ? "Funcionário desativado!" : "Funcionário reativado!");
  };

  const confirmarExclusao = async (id) => {
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao excluir funcionário.");
    } else {
      carregarFuncionarios();
      toast.success("Funcionário excluído permanentemente.");
    }
  };

  const excluirFuncionario = (id, nomeFuncionario) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--danger-text)' }}>
          ⚠️ Atenção!
        </span>
        <span style={{ color: 'var(--text-main)' }}>
          Deseja EXCLUIR definitivamente <b>{nomeFuncionario}</b>?<br/>Isso apagará o histórico de marmitas.
        </span>
        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', marginTop: '5px' }}>
          <button 
            onClick={() => {
              confirmarExclusao(id);
              toast.dismiss(t.id);
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'var(--danger-bg)', 
              color: 'var(--danger-text)', 
              border: '1px solid var(--danger-text)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            Sim, Excluir
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)} 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'var(--bg-body)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { minWidth: '320px', backgroundColor: 'var(--bg-card)' } });
  };

  // ==========================================
  // FUNÇÕES DE RELATÓRIO DIÁRIO
  // ==========================================
  const carregarRelatorio = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select(`id, data_reserva, retirou, funcionarios ( nome )`)
      .eq('data_reserva', dataFiltro);

    if (error) {
      console.error("Erro ao buscar relatório:", error);
    } else {
      setReservas(data);
    }
  };

  const enviarWhatsApp = () => {
    if (reservas.length === 0) {
      toast.error("Não há reservas para enviar nesta data.");
      return;
    }
    const dataFormatada = dataFiltro.split('-').reverse().join('/');
    const texto = `Olá! Segue o fechamento de marmitas para hoje (${dataFormatada}):\n\n*Total a preparar/entregar:* ${reservas.length} marmitas.\n\nObrigado!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const imprimirRelatorio = () => { window.print(); };

  // ==========================================
  // FUNÇÕES: FECHAMENTO MENSAL
  // ==========================================
  
  const gerarFechamento = async () => {
    // 1. Busca os preços mais recentes do banco ANTES de calcular
    const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
    let precosAtualizados = precos;
    
    if (config) {
      precosAtualizados = { valor_retirada: config.valor_retirada, valor_falta: config.valor_falta };
      setPrecos(precosAtualizados); // Atualiza os inputs na tela
    }

    // 2. Define as datas do mês selecionado
    const [ano, mes] = mesFechamento.split('-');
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
    const hojeIso = new Date().toISOString().split('T')[0];

    // 3. Puxa o histórico de marmitas
    const { data, error } = await supabase
      .from('reservas')
      .select(`id, data_reserva, retirou, funcionarios ( nome )`)
      .gte('data_reserva', primeiroDia)
      .lte('data_reserva', ultimoDia)
      .order('data_reserva', { ascending: true });

    if (error || !data) return;

    // 4. Faz os cálculos usando os preços garantidos
    const dadosProcessados = data.map(r => {
      let valorCobrado = 0;
      let statusDesc = '';

      if (r.retirou) {
        valorCobrado = Number(precosAtualizados.valor_retirada);
        statusDesc = 'Retirou';
      } else {
        if (r.data_reserva <= hojeIso) {
          valorCobrado = Number(precosAtualizados.valor_falta);
          statusDesc = 'Faltou';
        } else {
          valorCobrado = 0;
          statusDesc = 'Pendente'; 
        }
      }
      return { ...r, valorCobrado, statusDesc };
    });

    setDadosFechamento(dadosProcessados);
  };

  const salvarPrecos = async () => {
    const { error } = await supabase
      .from('configuracoes')
      .update({ 
        valor_retirada: precos.valor_retirada, 
        valor_falta: precos.valor_falta 
      })
      .eq('id', 1);

    if (error) {
      toast.error("Erro ao salvar preços.");
    } else {
      toast.success("Preços atualizados com sucesso!");
      gerarFechamento(); // Recalcula a tabela automaticamente com os novos preços!
    }
  };

  // Prepara dados do Relatório Geral
  const resumoGeral = dadosFechamento.reduce((acc, curr) => {
    const nome = curr.funcionarios?.nome || 'Desconhecido';
    if (!acc[nome]) {
      acc[nome] = { nome, qtdRetiradas: 0, qtdFaltas: 0, totalPagar: 0 };
    }
    if (curr.statusDesc === 'Retirou') acc[nome].qtdRetiradas += 1;
    if (curr.statusDesc === 'Faltou') acc[nome].qtdFaltas += 1;
    acc[nome].totalPagar += curr.valorCobrado;
    return acc;
  }, {});

  const listaGeral = Object.values(resumoGeral).sort((a, b) => a.nome.localeCompare(b.nome));

  // Filtro inteligente para o relatório detalhado
  const dadosDetalhadosFiltrados = filtroFuncionario 
    ? dadosFechamento.filter(r => 
        r.funcionarios?.nome?.toLowerCase().includes(filtroFuncionario.toLowerCase())
      )
    : dadosFechamento;

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const TabBtn = ({ label, icon, value }) => (
    <button 
      onClick={() => setAbaAtiva(value)}
      style={{
        padding: '12px 24px', 
        border: 'none', 
        borderRadius: '12px', 
        cursor: 'pointer', 
        fontSize: '1rem', 
        fontWeight: abaAtiva === value ? 'bold' : 'normal',
        backgroundColor: abaAtiva === value ? 'var(--accent-main)' : 'var(--bg-card)',
        color: abaAtiva === value ? 'white' : 'var(--text-main)',
        transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          .main-content { padding: 0 !important; background-color: white !important; }
          .print-card { box-shadow: none !important; padding: 0 !important; border: none !important; }
          body { color: black !important; }
        }
      `}</style>

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <div className="no-print" style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <TabBtn label="Gerenciar Funcionários" icon="👥" value="funcionarios" />
        <TabBtn label="Relatório de Reservas" icon="📊" value="relatorios" />
        <TabBtn label="Fechamento Mensal" icon="💰" value="fechamento" />
      </div>

      {/* ========================================================== */}
      {/* ABA 1: FUNCIONÁRIOS */}
      {/* ========================================================== */}
      {abaAtiva === 'funcionarios' && (
        <div className="print-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '30px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
        }}>
          <h2 style={{ 
            borderBottom: '2px solid var(--border-color)', 
            paddingBottom: '15px', 
            color: 'var(--text-main)', 
            fontSize: '1.5rem', 
            marginBottom: '25px' 
          }}>
            Cadastrar Novo Funcionário
          </h2>
          
          <form onSubmit={cadastrarFuncionario} style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px', 
            marginBottom: '40px' 
          }}>
            <input 
              type="text" 
              placeholder="Nome do Funcionário" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              style={{ 
                padding: '15px 20px', 
                borderRadius: '12px', 
                border: '2px solid var(--border-color)', 
                backgroundColor: 'var(--input-bg)', 
                color: 'var(--text-main)', 
                outline: 'none', 
                fontSize: '1.1rem' 
              }} 
            />
            <input 
              type="text" 
              placeholder="Senha (PIN) - máx 6" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)} 
              style={{ 
                padding: '15px 20px', 
                borderRadius: '12px', 
                border: '2px solid var(--border-color)', 
                backgroundColor: 'var(--input-bg)', 
                color: 'var(--text-main)', 
                outline: 'none', 
                fontSize: '1.1rem' 
              }} 
              maxLength={6} 
            />
            <button type="submit" style={{ 
              padding: '15px 20px', 
              backgroundColor: 'var(--accent-main)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '1.1rem', 
              transition: 'background-color 0.2s' 
            }}>
              Salvar
            </button>
          </form>

          <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>
            Lista de Funcionários
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--table-header)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Nome</th>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>PIN</th>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Status</th>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                      {f.nome}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-main)' }}>
                      {f.pin}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        backgroundColor: f.ativo ? 'var(--success-bg)' : 'var(--danger-bg)', 
                        color: f.ativo ? 'var(--success-text)' : 'var(--danger-text)', 
                        padding: '6px 12px', 
                        borderRadius: '24px', 
                        fontWeight: 'bold', 
                        fontSize: '0.9rem' 
                      }}>
                        {f.ativo ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => alternarStatus(f.id, f.ativo)} 
                        style={{ 
                          padding: '8px 16px', 
                          backgroundColor: 'var(--bg-body)', 
                          color: 'var(--text-main)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '24px', 
                          cursor: 'pointer', 
                          fontWeight: 'bold' 
                        }}
                      >
                        {f.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                      <button 
                        onClick={() => excluirFuncionario(f.id, f.nome)} 
                        style={{ 
                          padding: '8px 16px', 
                          backgroundColor: 'var(--danger-bg)', 
                          color: 'var(--danger-text)', 
                          border: `1px solid var(--danger-text)`, 
                          borderRadius: '24px', 
                          cursor: 'pointer', 
                          fontWeight: 'bold' 
                        }} 
                        title="Excluir permanentemente"
                      >
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 2: RELATÓRIOS DIÁRIOS */}
      {/* ========================================================== */}
      {abaAtiva === 'relatorios' && (
        <div className="print-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '30px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: '2px solid var(--border-color)', 
            paddingBottom: '15px', 
            marginBottom: '25px' 
          }}>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.5rem' }}>
              Histórico
            </h2>
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={imprimirRelatorio} 
                style={{ 
                  padding: '10px 15px', 
                  backgroundColor: 'var(--bg-body)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px' 
                }}
              >
                🖨️ PDF
              </button>
              <button 
                onClick={enviarWhatsApp} 
                style={{ 
                  padding: '10px 15px', 
                  backgroundColor: '#25D366', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px' 
                }}
              >
                🟢 WhatsApp
              </button>
            </div>
          </div>
          
          <div className="no-print" style={{ marginTop: '20px', marginBottom: '30px' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px', color: 'var(--accent-main)' }}>
              Filtrar Data:
            </label>
            <input 
              type="date" 
              value={dataFiltro} 
              onChange={(e) => setDataFiltro(e.target.value)} 
              style={{ 
                padding: '12px 18px', 
                borderRadius: '12px', 
                border: '2px solid var(--border-color)', 
                backgroundColor: 'var(--input-bg)', 
                color: 'var(--text-main)', 
                outline: 'none', 
                fontSize: '1rem' 
              }} 
            />
          </div>

          <div style={{ 
            backgroundColor: 'var(--table-header)', 
            padding: '25px', 
            borderRadius: '12px', 
            marginBottom: '30px', 
            border: '1px solid var(--border-color)', 
            textAlign: 'center' 
          }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              Período: <strong>{dataFiltro.split('-').reverse().join('/')}</strong>
            </p>
            <h3 style={{ margin: '10px 0 0 0', color: 'var(--text-main)', fontSize: '2rem' }}>
              Total: <strong style={{color: 'var(--accent-main)'}}>{reservas.length}</strong> marmitas
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--table-header)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Funcionário</th>
                  <th style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Status</th>
                  <th className="no-print" style={{ padding: '16px', color: 'var(--text-main)', fontSize: '1rem' }}>Cobrança?</th>
                </tr>
              </thead>
              <tbody>
                {reservas.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhuma reserva nesta data.
                    </td>
                  </tr>
                ) : (
                  reservas.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                        {r.funcionarios?.nome}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {r.retirou 
                          ? <span style={{ 
                              backgroundColor: 'var(--success-bg)', 
                              color: 'var(--success-text)', 
                              padding: '6px 12px', 
                              borderRadius: '24px', 
                              fontWeight: 'bold', 
                              fontSize: '0.9rem' 
                            }}>
                              ✅ Entregue
                            </span> 
                          : <span style={{ 
                              backgroundColor: 'var(--warning-bg)', 
                              color: 'var(--warning-text)', 
                              padding: '6px 12px', 
                              borderRadius: '24px', 
                              fontWeight: 'bold', 
                              fontSize: '0.9rem' 
                            }}>
                              ⏳ Pendente
                            </span>
                        }
                      </td>
                      <td className="no-print" style={{ padding: '16px' }}>
                        {(!r.retirou && dataFiltro < new Date().toISOString().split('T')[0]) 
                          ? <span style={{ color: 'var(--danger-text)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              Sim (Descontar)
                            </span> 
                          : '-'
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 3: FECHAMENTO MENSAL */}
      {/* ========================================================== */}
      {abaAtiva === 'fechamento' && (
        <div className="print-card" style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '30px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
        }}>
          
          <div className="no-print" style={{ 
            marginBottom: '40px', 
            padding: '20px', 
            backgroundColor: 'var(--bg-body)', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)' 
          }}>
            <h3 style={{ color: 'var(--text-main)', marginTop: 0, marginBottom: '20px' }}>
              ⚙️ Tabela de Preços Atuais
            </h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                  Valor SE Retirar a Marmita (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={precos.valor_retirada} 
                  onChange={(e) => setPrecos({...precos, valor_retirada: e.target.value})} 
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '2px solid var(--border-color)', 
                    backgroundColor: 'var(--input-bg)', 
                    color: 'var(--text-main)', 
                    width: '200px', 
                    outline: 'none' 
                  }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--danger-text)', fontWeight: 'bold' }}>
                  Valor SE NÃO Retirar (Falta) (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={precos.valor_falta} 
                  onChange={(e) => setPrecos({...precos, valor_falta: e.target.value})} 
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '2px solid #fca5a5', 
                    backgroundColor: 'var(--input-bg)', 
                    color: 'var(--text-main)', 
                    width: '200px', 
                    outline: 'none' 
                  }} 
                />
              </div>
              <button 
                onClick={salvarPrecos} 
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: 'var(--accent-main)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  height: '45px', 
                  transition: 'background-color 0.2s' 
                }}
              >
                Salvar Preços
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '15px', fontStyle: 'italic' }}>
              * Os valores salvos aqui serão usados para calcular a cobrança no relatório abaixo.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
              Fechamento Financeiro
            </h2>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <input 
                type="month" 
                value={mesFechamento} 
                onChange={(e) => setMesFechamento(e.target.value)} 
                style={{ 
                  padding: '10px 15px', 
                  borderRadius: '8px', 
                  border: '2px solid var(--border-color)', 
                  backgroundColor: 'var(--input-bg)', 
                  color: 'var(--text-main)', 
                  outline: 'none' 
                }} 
              />
              {/* Botão mantido como opcional para forçar atualização se necessário */}
              <button 
                onClick={gerarFechamento} 
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: 'var(--accent-main)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                🔄 Atualizar
              </button>
              <button 
                onClick={() => window.print()} 
                style={{ 
                  padding: '10px 15px', 
                  backgroundColor: 'var(--bg-body)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                🖨️ PDF
              </button>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button 
                 onClick={() => setTipoFechamento('geral')} 
                 style={{ 
                   padding: '8px 16px', 
                   borderRadius: '8px', 
                   border: 'none', 
                   cursor: 'pointer', 
                   fontWeight: 'bold', 
                   backgroundColor: tipoFechamento === 'geral' ? 'var(--text-main)' : 'var(--bg-body)', 
                   color: tipoFechamento === 'geral' ? 'var(--bg-card)' : 'var(--text-main)' 
                 }}
               >
                 📋 Resumo por Funcionário
               </button>
               <button 
                 onClick={() => setTipoFechamento('detalhado')} 
                 style={{ 
                   padding: '8px 16px', 
                   borderRadius: '8px', 
                   border: 'none', 
                   cursor: 'pointer', 
                   fontWeight: 'bold', 
                   backgroundColor: tipoFechamento === 'detalhado' ? 'var(--text-main)' : 'var(--bg-body)', 
                   color: tipoFechamento === 'detalhado' ? 'var(--bg-card)' : 'var(--text-main)' 
                 }}
               >
                 🔍 Extrato Detalhado Diário
               </button>
             </div>
             
             {/* A BARRA DE PESQUISA EM TEXTO APARECE AQUI */}
             {tipoFechamento === 'detalhado' && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <label style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                   Pesquisar Funcionário:
                 </label>
                 <input 
                   type="text"
                   placeholder="Digite o nome..."
                   value={filtroFuncionario} 
                   onChange={(e) => setFiltroFuncionario(e.target.value)}
                   style={{ 
                     padding: '8px 15px', 
                     borderRadius: '8px', 
                     border: '2px solid var(--border-color)', 
                     backgroundColor: 'var(--input-bg)', 
                     color: 'var(--text-main)', 
                     outline: 'none', 
                     fontWeight: 'normal' 
                   }}
                 />
               </div>
             )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {tipoFechamento === 'geral' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--table-header)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Funcionário</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Qtd. Retiradas</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Qtd. Faltas</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Total a Descontar</th>
                  </tr>
                </thead>
                <tbody>
                  {listaGeral.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum dado encontrado para o mês selecionado.
                      </td>
                    </tr>
                  ) : (
                    listaGeral.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {item.nome}
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-main)' }}>
                          {item.qtdRetiradas}
                        </td>
                        <td style={{ padding: '16px', color: 'var(--danger-text)', fontWeight: 'bold' }}>
                          {item.qtdFaltas}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--accent-main)', fontSize: '1.1rem' }}>
                          {formatarMoeda(item.totalPagar)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--table-header)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Data</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Funcionário</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Status</th>
                    <th style={{ padding: '16px', color: 'var(--text-main)' }}>Valor Cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosDetalhadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum dado encontrado para esta pesquisa.
                      </td>
                    </tr>
                  ) : (
                    dadosDetalhadosFiltrados.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px', color: 'var(--text-main)' }}>
                          {r.data_reserva.split('-').reverse().join('/')}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {r.funcionarios?.nome}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {r.statusDesc === 'Retirou' && <span style={{ color: 'var(--success-text)', fontWeight: 'bold' }}>✔️ Retirou</span>}
                          {r.statusDesc === 'Faltou' && <span style={{ color: 'var(--danger-text)', fontWeight: 'bold' }}>❌ Faltou</span>}
                          {r.statusDesc === 'Pendente' && <span style={{ color: 'var(--warning-text)', fontWeight: 'bold' }}>⏳ Pendente</span>}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 'bold', color: r.valorCobrado > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {formatarMoeda(r.valorCobrado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}