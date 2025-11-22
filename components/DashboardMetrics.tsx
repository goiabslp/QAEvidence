
import React, { useState, useMemo } from 'react';
import { ArchivedTicket, User, TestStatus } from '../types';
import { CheckCircle2, XCircle, AlertCircle, Clock, Layers, BarChart3, Filter, ChevronDown, ChevronUp, User as UserIcon, PieChart, LayoutDashboard } from 'lucide-react';

interface DashboardMetricsProps {
  tickets: ArchivedTicket[];
  users: User[];
  currentUser: User;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ tickets, users, currentUser }) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'MINE'>('ALL');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const isAdmin = currentUser.role === 'ADMIN';

  // Helper to calculate ticket status
  const getTicketStatus = (ticket: ArchivedTicket): TestStatus => {
    const items = ticket.items;
    const hasFailure = items.some(i => i.status === TestStatus.FAIL);
    const hasBlocker = items.some(i => i.status === TestStatus.BLOCKED);
    const hasPending = items.some(i => i.status === TestStatus.PENDING || i.status === TestStatus.SKIPPED);
    
    if (hasFailure) return TestStatus.FAIL;
    if (hasBlocker) return TestStatus.BLOCKED;
    if (hasPending) return TestStatus.PENDING; 
    return TestStatus.PASS;
  };

  // Filter tickets based on selection
  const filteredTickets = useMemo(() => {
    if (!isAdmin || filterMode === 'MINE') {
      return tickets.filter(t => t.createdBy === currentUser.acronym);
    }
    return tickets;
  }, [tickets, filterMode, isAdmin, currentUser]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const stats = {
      total: 0,
      pass: 0,
      fail: 0,
      blocked: 0,
      pending: 0
    };

    filteredTickets.forEach(t => {
      stats.total++;
      const status = getTicketStatus(t);
      if (status === TestStatus.PASS) stats.pass++;
      else if (status === TestStatus.FAIL) stats.fail++;
      else if (status === TestStatus.BLOCKED) stats.blocked++;
      else stats.pending++;
    });

    return stats;
  }, [filteredTickets]);

  // Group by User for detailed view
  const userMetrics = useMemo(() => {
    const userMap = new Map<string, { user: User | undefined, total: number, pass: number, fail: number, blocked: number, pending: number }>();

    // Initialize with all relevant users if showing ALL, or just current if MINE
    const usersToProcess = (!isAdmin || filterMode === 'MINE') 
        ? users.filter(u => u.acronym === currentUser.acronym)
        : users;

    usersToProcess.forEach(u => {
        userMap.set(u.acronym, { 
            user: u, 
            total: 0, 
            pass: 0, 
            fail: 0, 
            blocked: 0, 
            pending: 0 
        });
    });

    // Populate data
    filteredTickets.forEach(t => {
        if (!userMap.has(t.createdBy)) {
             // Fallback if user deleted or not in list
             const unknownUser = { acronym: t.createdBy, name: 'Desconhecido', role: 'USER' } as User;
             userMap.set(t.createdBy, { user: unknownUser, total: 0, pass: 0, fail: 0, blocked: 0, pending: 0 });
        }
        
        const stat = userMap.get(t.createdBy)!;
        stat.total++;
        const status = getTicketStatus(t);
        
        if (status === TestStatus.PASS) stat.pass++;
        else if (status === TestStatus.FAIL) stat.fail++;
        else if (status === TestStatus.BLOCKED) stat.blocked++;
        else stat.pending++;
    });

    return Array.from(userMap.values()).sort((a, b) => b.total - a.total);
  }, [filteredTickets, users, filterMode, isAdmin, currentUser]);

  const toggleUserExpand = (acronym: string) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(acronym)) newSet.delete(acronym);
    else newSet.add(acronym);
    setExpandedUsers(newSet);
  };

  // Calculate percentages for chart
  const total = metrics.total || 1; // avoid div by 0
  const pctPass = Math.round((metrics.pass / total) * 100);
  const pctFail = Math.round((metrics.fail / total) * 100);
  const pctBlocked = Math.round((metrics.blocked / total) * 100);
  const pctPending = 100 - pctPass - pctFail - pctBlocked; // remainder

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              Dashboard de Métricas
           </h2>
           <p className="text-sm text-slate-500 mt-1">Visão geral do desempenho e status dos chamados.</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
         {/* Total */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 mb-1 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
            </div>
            <span className="text-3xl font-extrabold text-slate-800">{metrics.total}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Chamados</span>
         </div>

         {/* Success */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 mb-1 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-3xl font-extrabold text-slate-800">{metrics.pass}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Com Sucesso</span>
         </div>

         {/* Pending */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-400"></div>
            <div className="p-3 bg-slate-100 rounded-full text-slate-500 mb-1 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
            </div>
            <span className="text-3xl font-extrabold text-slate-800">{metrics.pending}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendentes</span>
         </div>

         {/* Blocked */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-1 group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-extrabold text-slate-800">{metrics.blocked}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impedimentos</span>
         </div>

         {/* Failed */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="p-3 bg-red-50 rounded-full text-red-600 mb-1 group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-extrabold text-slate-800">{metrics.fail}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Falhas</span>
         </div>
      </div>

      {/* Simple Distribution Chart Bar */}
      {metrics.total > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" /> Distribuição Percentual
                </h3>
             </div>
             <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden flex">
                 {pctPass > 0 && <div style={{ width: `${pctPass}%` }} className="bg-emerald-500 h-full transition-all duration-500 hover:bg-emerald-400 relative group" title={`Sucesso: ${pctPass}%`}></div>}
                 {pctPending > 0 && <div style={{ width: `${pctPending}%` }} className="bg-slate-400 h-full transition-all duration-500 hover:bg-slate-300 relative group" title={`Pendente: ${pctPending}%`}></div>}
                 {pctBlocked > 0 && <div style={{ width: `${pctBlocked}%` }} className="bg-amber-500 h-full transition-all duration-500 hover:bg-amber-400 relative group" title={`Impedimento: ${pctBlocked}%`}></div>}
                 {pctFail > 0 && <div style={{ width: `${pctFail}%` }} className="bg-red-500 h-full transition-all duration-500 hover:bg-red-400 relative group" title={`Falha: ${pctFail}%`}></div>}
             </div>
             <div className="flex flex-wrap gap-6 mt-3 justify-center">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Sucesso ({pctPass}%)
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-slate-400"></div> Pendente ({pctPending}%)
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div> Impedimento ({pctBlocked}%)
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div> Falha ({pctFail}%)
                 </div>
             </div>
          </div>
      )}

      {/* Detailed User List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
             <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                 <BarChart3 className="w-5 h-5 text-indigo-600" />
             </div>
             <h3 className="font-bold text-slate-800 text-lg">Detalhamento por Usuário</h3>
         </div>

         <div className="divide-y divide-slate-100">
            {userMetrics.map((stat) => {
                const isExpanded = expandedUsers.has(stat.user?.acronym || '');
                return (
                    <div key={stat.user?.acronym || 'unknown'} className="group transition-colors hover:bg-slate-50">
                        <div 
                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                            onClick={() => toggleUserExpand(stat.user?.acronym || '')}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-200 text-slate-600 font-mono font-bold px-3 py-2 rounded-xl text-sm border border-slate-300">
                                    {stat.user?.acronym}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base">{stat.user?.name}</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {stat.total} chamados registrados
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-6 overflow-x-auto pb-2 md:pb-0">
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-lg font-bold text-emerald-600">{stat.pass}</span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Sucesso</span>
                                </div>
                                <div className="w-px h-8 bg-slate-100 hidden md:block"></div>
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-lg font-bold text-slate-500">{stat.pending}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400/80 tracking-wider">Pendente</span>
                                </div>
                                <div className="w-px h-8 bg-slate-100 hidden md:block"></div>
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-lg font-bold text-amber-600">{stat.blocked}</span>
                                    <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">Impedimento</span>
                                </div>
                                <div className="w-px h-8 bg-slate-100 hidden md:block"></div>
                                <div className="flex flex-col items-center min-w-[60px]">
                                    <span className="text-lg font-bold text-red-600">{stat.fail}</span>
                                    <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider">Falha</span>
                                </div>
                                
                                <div className={`ml-2 p-1.5 rounded-full transition-all duration-300 ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'text-slate-300 group-hover:bg-slate-100'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Expanded Details - Visual Bar for User */}
                        {isExpanded && stat.total > 0 && (
                            <div className="px-6 pb-6 pt-0 animate-slide-down bg-slate-50/50 border-t border-slate-100/50 inner-shadow">
                                <div className="pt-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Progresso Geral do Usuário</p>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${(stat.pass / stat.total) * 100}%` }} className="bg-emerald-500 h-full"></div>
                                        <div style={{ width: `${(stat.pending / stat.total) * 100}%` }} className="bg-slate-400 h-full"></div>
                                        <div style={{ width: `${(stat.blocked / stat.total) * 100}%` }} className="bg-amber-500 h-full"></div>
                                        <div style={{ width: `${(stat.fail / stat.total) * 100}%` }} className="bg-red-500 h-full"></div>
                                    </div>
                                    <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-mono">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            
            {userMetrics.length === 0 && (
                <div className="p-8 text-center text-slate-400">Nenhum dado encontrado para os filtros aplicados.</div>
            )}
         </div>
      </div>

    </div>
  );
};

export default DashboardMetrics;
