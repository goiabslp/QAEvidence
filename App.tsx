
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import { EvidenceItem, TestStatus, Severity, TicketInfo, TestCaseDetails } from './types';
import { PieChart, BarChart2, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Tipo para o gatilho do Wizard
export interface WizardTriggerContext {
  mode: 'create' | 'edit';
  scenarioNumber: number;
  nextCaseNumber: number;
  ticketInfo: TicketInfo;
  evidenceId?: string; // ID da evidência original (apenas para edição)
  existingDetails?: TestCaseDetails; // Detalhes para preencher o form (apenas edição)
}

const App: React.FC = () => {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [showStats, setShowStats] = useState(true);
  
  // Estado para controlar a abertura do Wizard via lista
  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);

  // Initial Data Mock
  useEffect(() => {
    setEvidences([
      {
        id: '1',
        title: 'Erro 500 ao salvar senha',
        description: 'O sistema não valida corretamente caracteres especiais no campo de senha.',
        status: TestStatus.FAIL,
        severity: Severity.HIGH,
        imageUrl: 'https://picsum.photos/seed/bug1/800/600',
        timestamp: Date.now() - 1000000,
        ticketInfo: {
          sprint: 'Sprint 23',
          ticketId: '#QA-402',
          ticketSummary: 'Validação Senha',
          ticketTitle: '#QA-402 - Portal Web - Validação Senha - Staging - Sprint 23 - João Silva',
          clientSystem: 'Portal Web - Painel do Usuário',
          requester: 'Product Owner',
          analyst: 'João Silva',
          requestDate: '2023-10-25',
          environment: 'Staging',
          environmentVersion: '1.2.0',
          evidenceDate: '2023-10-26',
          ticketDescription: 'Usuário deve poder criar senha com caracteres especiais.',
          solution: 'Pendente correção no backend.'
        },
        testCaseDetails: {
          scenarioNumber: 1,
          caseNumber: 1,
          caseId: 'TC-001',
          screen: 'Login',
          result: 'Fracassou',
          objective: 'Validar senha forte',
          preRequisite: 'Acesso a internet',
          condition: 'Senha com @',
          expectedResult: 'Salvar com sucesso'
        }
      },
      {
        id: '2',
        title: 'Menu hamburguer travado',
        description: 'O menu não expande ao clicar na versão mobile iOS.',
        status: TestStatus.FAIL,
        severity: Severity.MEDIUM,
        imageUrl: 'https://picsum.photos/seed/bug2/800/600',
        timestamp: Date.now() - 500000,
        ticketInfo: {
          sprint: 'Sprint 23',
          ticketId: '#QA-405',
          ticketSummary: 'Menu iOS',
          ticketTitle: '#QA-405 - App Mobile iOS - Menu iOS - Dev - Sprint 23 - Maria Souza',
          clientSystem: 'App Mobile iOS',
          requester: 'Designer UX',
          analyst: 'Maria Souza',
          requestDate: '2023-10-26',
          environment: 'Dev',
          environmentVersion: '0.9.5-RC',
          evidenceDate: '2023-10-27',
          ticketDescription: 'Header deve ser responsivo em telas < 768px.',
          solution: 'Ajuste CSS no z-index do menu.'
        }
      },
      {
        id: '3',
        title: 'Fluxo de Cadastro OK',
        description: 'Cadastro realizado e usuário redirecionado para dashboard.',
        status: TestStatus.PASS,
        severity: Severity.LOW,
        imageUrl: 'https://picsum.photos/seed/success1/800/600',
        timestamp: Date.now(),
        ticketInfo: {
          sprint: 'Sprint 24',
          ticketId: '#QA-410',
          ticketSummary: 'Onboarding PF',
          ticketTitle: '#QA-410 - Web Landing Page - Onboarding PF - Homologação - Sprint 24 - João Silva',
          clientSystem: 'Web - Landing Page',
          requester: 'Gerente de Projetos',
          analyst: 'João Silva',
          requestDate: '2023-10-27',
          environment: 'Homologação',
          environmentVersion: '1.3.0',
          evidenceDate: '2023-10-27',
          ticketDescription: 'Validar cadastro de novos usuários PF.',
          solution: 'Fluxo validado com sucesso.'
        }
      }
    ]);
  }, []);

  const handleAddEvidence = (newEvidence: Omit<EvidenceItem, 'id' | 'timestamp'>) => {
    const item: EvidenceItem = {
      ...newEvidence,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setEvidences([item, ...evidences]);
  };

  const handleWizardSave = (items: EvidenceItem[]) => {
    if (wizardTrigger?.mode === 'edit') {
      // Modo Edição: Atualiza o item existente
      const updatedItem = items[0]; // Assumindo que a edição retorna apenas 1 item
      setEvidences(prevEvidences => 
        prevEvidences.map(ev => ev.id === updatedItem.id ? updatedItem : ev)
      );
    } else {
      // Modo Criação: Adiciona novos itens
      setEvidences([...items, ...evidences]);
    }
    
    // Limpa o trigger após salvar
    setWizardTrigger(null);
  };

  const handleDeleteEvidence = (id: string) => {
    setEvidences(evidences.filter(e => e.id !== id));
  };

  // Prepara o contexto para abrir o Wizard em modo de criação (adicionar caso ao cenário)
  const handleAddCase = (originId: string) => {
    const origin = evidences.find(e => e.id === originId);
    if (!origin || !origin.testCaseDetails) return;

    const scenarioNum = origin.testCaseDetails.scenarioNumber;
    
    // Encontra o maior número de caso existente para este cenário
    const existingCases = evidences.filter(e => e.testCaseDetails?.scenarioNumber === scenarioNum);
    const maxCaseNum = existingCases.reduce((max, curr) => {
      return Math.max(max, curr.testCaseDetails?.caseNumber || 0);
    }, 0);
    
    const nextCaseNum = maxCaseNum + 1;

    setWizardTrigger({
      mode: 'create',
      scenarioNumber: scenarioNum,
      nextCaseNumber: nextCaseNum,
      ticketInfo: origin.ticketInfo
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prepara o contexto para abrir o Wizard em modo de EDIÇÃO
  const handleEditCase = (id: string) => {
    const item = evidences.find(e => e.id === id);
    if (!item || !item.testCaseDetails) return;

    setWizardTrigger({
      mode: 'edit',
      scenarioNumber: item.testCaseDetails.scenarioNumber,
      nextCaseNumber: item.testCaseDetails.caseNumber,
      ticketInfo: item.ticketInfo,
      evidenceId: item.id,
      existingDetails: item.testCaseDetails
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stats Calculation
  const stats = {
    total: evidences.length,
    passed: evidences.filter(e => e.status === TestStatus.PASS).length,
    failed: evidences.filter(e => e.status === TestStatus.FAIL).length,
    blocked: evidences.filter(e => e.status === TestStatus.BLOCKED).length,
  };

  const chartData = [
    { name: 'Passou', value: stats.passed, color: '#22c55e' },
    { name: 'Falhou', value: stats.failed, color: '#ef4444' },
    { name: 'Bloqueado', value: stats.blocked, color: '#f97316' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Controls / Dashboard Summary */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard de Testes</h2>
            <p className="text-gray-500">Gerencie suas evidências e acompanhe métricas de QA.</p>
          </div>
          <div className="flex gap-3 items-center">
            
            <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

            <button 
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${showStats ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}
            >
              {showStats ? <PieChart className="w-4 h-4 mr-2" /> : <BarChart2 className="w-4 h-4 mr-2" />}
              {showStats ? 'Métricas' : 'Métricas'}
            </button>
          </div>
        </div>

        {/* Statistics Section */}
        {showStats && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
            {/* Quick Cards */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Total de Casos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Passou</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.passed}</p>
              </div>
              <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${stats.total ? (stats.passed / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase">Falhas</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
              </div>
              <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${stats.total ? (stats.failed / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
               <div style={{ width: '100%', height: 100 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {/* Main Content: Form and List */}
        <div className="space-y-8">
          <EvidenceForm 
            onSubmit={handleAddEvidence} 
            onWizardSave={handleWizardSave}
            wizardTrigger={wizardTrigger}
            onClearTrigger={() => setWizardTrigger(null)}
            evidences={evidences}
          />
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
              Evidências Recentes
            </h3>
            <EvidenceList 
              evidences={evidences} 
              onDelete={handleDeleteEvidence} 
              onAddCase={handleAddCase}
              onEditCase={handleEditCase}
            />
          </div>
          
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default App;
