import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArchivedTicket, User, TestStatus, EvidenceItem } from '../types';
import { CheckCircle2, XCircle, AlertCircle, Clock, Layers, BarChart3, ChevronDown, User as UserIcon, PieChart, LayoutDashboard, Activity, CheckCheck, FolderClock, Timer, Check } from 'lucide-react';

interface DashboardMetricsProps {
  tickets: ArchivedTicket[];
  users: User[];
  currentUser: User;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ tickets, users, currentUser }) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'MINE'>('ALL');
  const [selectedSprint, setSelectedSprint] = useState<string>('ALL');

  const isAdmin = currentUser.role === 'ADMIN';

  // Custom Dropdown State
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);

  // Extract Unique Sprints
  const availableSprints = useMemo(() => {
    const sprints = new Set<string>();
    tickets.forEach(t => {
        if (t.ticketInfo.sprint) sprints.add(t.ticketInfo.sprint);
    });
    return Array.from(sprints).sort((a, b) => {
        // Try numeric sort
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
  }, [tickets]);

  // Click Outside Handler for Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(event.target as Node)) {
        setIsSprintOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC HELPERS ---

  // Determine Ticket Status based on specific business rules
  // Success: All scenarios PASS
  // Pending: All scenarios PENDING/SKIPPED
  // In Progress: Any FAIL/BLOCKED or mixed
  const getTicketState = (ticket: ArchivedTicket): 'SUCCESS' | 'PENDING' | 'IN_PROGRESS' => {
    const items = ticket.items;
    if (!items || items.length === 0) return 'PENDING';

    // Check if all scenarios are Success
    const allSuccess = items.every(i => i.status === TestStatus.PASS);
    if (allSuccess) return 'SUCCESS';

    // Check if all scenarios are Pending (Pending or Skipped)
    const allPending = items.every(i => i.status === TestStatus.PENDING || i.status === TestStatus.SKIPPED);
    if (allPending) return 'PENDING';

    // Check for Fail or Blocked (At least 1) or Mixed states
    return 'IN_PROGRESS';
  };

  // Filter tickets based on selection
  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Filter by Owner
    if (!isAdmin || filterMode === 'MINE') {
      result = result.filter(t => t.createdBy === currentUser.acronym);
    }

    // Filter by Sprint
    if (selectedSprint !== 'ALL') {
      result = result.filter(t => t.ticketInfo.sprint === selectedSprint);
    }

    return result;
  }, [tickets, filterMode, isAdmin, currentUser, selectedSprint]);

  // --- METRICS CALCULATION ---
  const metrics = useMemo(() => {
    const data = {
      tickets: {
        total: 0,
        finished: 0,    // SUCCESS
        pending: 0,     // PENDING
        inProgress: 0,  // IN_PROGRESS
      },
      scenarios: {
        total: 0,
        finished: 0,
        inProgress: 0
      },
      cases: {
        total: 0,
        success: 0,
        pending: 0,
        blocked: 0,
        fail: 0
      }
    };

    filteredTickets.forEach(t => {
      // 1. Ticket Metrics
      data.tickets.total++;
      const tState = getTicketState(t);
      
      if (tState === 'SUCCESS') {
        data.tickets.finished++;
      } else if (tState === 'PENDING') {
        data.tickets.pending++;
      } else {
        data.tickets.inProgress++; 
      }

      // 2. Scenario Metrics
      const scenarios = new Map<number, EvidenceItem[]>();
      t.items.forEach(i => {
        if (i.testCaseDetails) {
          const sNum = i.testCaseDetails.scenarioNumber;
          if (!scenarios.has(sNum)) scenarios.set(sNum, []);
          scenarios.get(sNum)?.push(i);
        }
      });

      data.scenarios.total += scenarios.size;
      scenarios.forEach(items => {
        const isScenarioFinished = items.every(i => i.status === TestStatus.PASS);
        if (isScenarioFinished) data.scenarios.finished++;
        else data.scenarios.inProgress++;
      });

      // 3. Case Metrics
      t.items.forEach(i => {
        data.cases.total++;
        switch (i.status) {
          case TestStatus.PASS: data.cases.success++; break;
          case TestStatus.FAIL: data.cases.fail++; break;
          case TestStatus.BLOCKED: data.cases.blocked++; break;
          case TestStatus.SKIPPED: 
          case TestStatus.PENDING: 
            data.cases.pending++; break;
          default: data.cases.pending++;
        }
      });
    });

    return data;
  }, [filteredTickets]);

  // --- USER STATS CALCULATION ---
  const userStats = useMemo(() => {
    const map = new Map<string, {
      user: User | undefined,
      ticketsCount: number,
      totalCases: number,
      cases: { success: number, pending: number, blocked: number, fail: number }
    }>();

    // Initialize with all relevant users
    const usersToProcess = (!isAdmin || filterMode === 'MINE') 
        ? users.filter(u => u.acronym === currentUser.acronym)
        : users;

    usersToProcess.forEach(u => {
        map.set(u.acronym, { 
            user: u, 
            ticketsCount: 0,
            totalCases: 0, 
            cases: { success: 0, pending: 0, blocked: 0, fail: 0 }
        });
    });

    // Populate data
    filteredTickets.forEach(t => {
        if (!map.has(t.createdBy)) {
             if (!isAdmin) return; 
             const unknownUser = { acronym: t.createdBy, name: 'Desconhecido', role: 'USER' } as User;
             map.set(t.createdBy, { user: unknownUser, ticketsCount: 0, totalCases: 0, cases: { success: 0, pending: 0, blocked: 0, fail: 0 } });
        }
        
        const stat = map.get(t.createdBy)!;
        stat.ticketsCount++;
        
        t.items.forEach(i => {
            stat.totalCases++;
            switch (i.status) {
                case TestStatus.PASS: stat.cases.success++; break;
                case TestStatus.FAIL: stat.cases.fail++; break;
                case TestStatus.BLOCKED: stat.cases.blocked++; break;
                default: stat.cases.pending++; break;
            }
        });
    });

    return Array.from(map.values()).sort((a, b) => b.totalCases - a.totalCases);
  }, [filteredTickets, users, filterMode, isAdmin, currentUser]);


  // Chart Percentages (Based on Cases)
  const totalCases = metrics.cases.total || 1;
  const pctPass = Math.round((metrics.cases.success / totalCases) * 100);
  const pctFail = Math.round((metrics.cases.fail / totalCases) * 100);
  const pctBlocked = Math.round((metrics.cases.blocked / totalCases) * 100);
  const pctPending = 100 - pctPass - pctFail - pctBlocked;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              Dashboard de Métricas
           </h2>
           <p className="text-sm text-slate-500 mt-1">
               {isAdmin ? 'Visão geral de desempenho e distribuição de casos.' : 'Acompanhe suas métricas de desempenho.'}
           </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
             {/* MODERN SPRINT SELECTOR */}
             <div className="relative group min-w-[180px]" ref={sprintDropdownRef}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                    <Timer className="w-4 h-4" />
                </div>
                <button
                    type="button"
                    onClick={() => setIsSprintOpen(!isSprintOpen)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-left text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all shadow-sm flex items-center justify-between"
                >
                    <span className="truncate">
                        {selectedSprint === 'ALL' ? 'Todas Sprints' : `Sprint ${selectedSprint}`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSprintOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSprintOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-slide-down custom-scrollbar">
                        <div className="p-1.5 space-y-1">
                            <button
                                onClick={() => { setSelectedSprint('ALL'); setIsSprintOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedSprint === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span>Todas Sprints</span>
                                {selectedSprint === 'ALL' && <Check className="w-4 h-4" />}
                            </button>
                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            {availableSprints.map(sprint => (
                                <button
                                    key={sprint}
                                    onClick={() => { setSelectedSprint(sprint); setIsSprintOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedSprint === sprint ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <span>Sprint {sprint}</span>
                                    {selectedSprint === sprint && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="relative">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setFilterMode('MINE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                filterMode === 'MINE' 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            Minhas Métricas
                        </button>
                        <button
                            onClick={() => setFilterMode('ALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                filterMode === 'ALL' 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            Visão Geral
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 1. VISÃO GERAL DE DESEMPENHO (3 Blocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BLOCK 1: CHAMADOS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                     <FolderClock className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Chamados</h3>
                  <span className="ml-auto text-2xl font-black text-slate-800">{metrics.tickets.total}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-auto">
                   <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                      <span className="text-xl font-black text-indigo-600">{metrics.tickets.inProgress}</span>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mt-1 leading-none">Em Andam.</span>
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                      <span className="text-xl font-black text-slate-600">{metrics.tickets.pending}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Pendentes</span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                      <span className="text-xl font-black text-emerald-600">{metrics.tickets.finished}</span>
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1 leading-none">Sucessos</span>
                  </div>
              </div>
          </div>

          {/* BLOCK 2: CENÁRIOS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-50 rounded-xl">
                     <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Cenários</h3>
                  <span className="ml-auto text-2xl font-black text-slate-800">{metrics.scenarios.total}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-blue-600">{metrics.scenarios.inProgress}</span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-1">Em Andamento</span>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-emerald-600">{metrics.scenarios.finished}</span>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">Finalizados</span>
                  </div>
              </div>
          </div>

          {/* BLOCK 3: CASOS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-slate-50 rounded-xl">
                     <Activity className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Casos</h3>
                  <span className="ml-auto text-2xl font-black text-slate-800">{metrics.cases.total}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between px-4">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Sucesso</span>
                      <span className="font-black text-emerald-700 text-lg">{metrics.cases.success}</span>
                  </div>
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between px-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Pendente</span>
                      <span className="font-black text-slate-600 text-lg">{metrics.cases.pending}</span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between px-4">
                      <span className="text-[10px] font-bold text-amber-600 uppercase">Imped.</span>
                      <span className="font-black text-amber-700 text-lg">{metrics.cases.blocked}</span>
                  </div>
                  <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 flex items-center justify-between px-4">
                      <span className="text-[10px] font-bold text-red-600 uppercase">Falha</span>
                      <span className="font-black text-red-700 text-lg">{metrics.cases.fail}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. DISTRIBUIÇÃO PERCENTUAL (Baseada em Casos) */}
      {metrics.cases.total > 0 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg">
                    <PieChart className="w-6 h-6 text-indigo-500" /> Distribuição Percentual
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    Distribuição calculada com base na quantidade total de casos registrados no sistema.
                </span>
             </div>
             
             <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                 {pctPass > 0 && <div style={{ width: `${pctPass}%` }} className="bg-emerald-500 h-full relative group transition-all hover:brightness-110"></div>}
                 {pctPending > 0 && <div style={{ width: `${pctPending}%` }} className="bg-slate-400 h-full relative group transition-all hover:brightness-110"></div>}
                 {pctBlocked > 0 && <div style={{ width: `${pctBlocked}%` }} className="bg-amber-500 h-full relative group transition-all hover:brightness-110"></div>}
                 {pctFail > 0 && <div style={{ width: `${pctFail}%` }} className="bg-red-500 h-full relative group transition-all hover:brightness-110"></div>}
             </div>
             
             <div className="flex flex-wrap gap-8 mt-6 justify-center">
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-emerald-600">{pctPass}%</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sucesso
                    </span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-slate-500">{pctPending}%</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div> Pendente
                    </span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-amber-600">{pctBlocked}%</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Impedimento
                    </span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-red-600">{pctFail}%</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Falha
                    </span>
                 </div>
             </div>
          </div>
      )}

      {/* 3. DETALHAMENTO POR USUÁRIO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
             <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                 <BarChart3 className="w-5 h-5 text-indigo-600" />
             </div>
             <h3 className="font-bold text-slate-800 text-lg">Detalhamento por Usuário</h3>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                    <tr>
                        <th className="px-6 py-4">Sigla</th>
                        <th className="px-6 py-4">Analista</th>
                        <th className="px-6 py-4 text-center">Chamados</th>
                        <th className="px-6 py-4 text-center">Total Casos</th>
                        <th className="px-6 py-4 text-center text-emerald-600">Sucesso</th>
                        <th className="px-6 py-4 text-center text-slate-500">Pendente</th>
                        <th className="px-6 py-4 text-center text-amber-600">Imped.</th>
                        <th className="px-6 py-4 text-center text-red-600">Falha</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {userStats.map((stat) => (
                        <tr key={stat.user?.acronym || 'unknown'} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                                <span className="font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                    {stat.user?.acronym}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">
                                {stat.user?.name}
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-600">
                                {stat.ticketsCount}
                            </td>
                            <td className="px-6 py-4 text-center font-black text-slate-800 text-base">
                                {stat.totalCases}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {stat.cases.success > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                                        {stat.cases.success}
                                    </span>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {stat.cases.pending > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                                        {stat.cases.pending}
                                    </span>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {stat.cases.blocked > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-100">
                                        {stat.cases.blocked}
                                    </span>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {stat.cases.fail > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] rounded-full bg-red-50 text-red-700 font-bold border border-red-100">
                                        {stat.cases.fail}
                                    </span>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                        </tr>
                    ))}
                    {userStats.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                                Nenhum dado disponível.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};

export default DashboardMetrics;