



import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Header from './components/common/Header';
import EvidenceForm from './components/features/evidence/EvidenceForm';
import EvidenceList from './components/features/evidence/EvidenceList';
import UserEvidenceList from './components/features/evidence/UserEvidenceList';
import Login from './components/features/auth/Login';
import UserManagement, { UserFormData } from './components/features/users/UserManagement';
import EvidenceManagement from './components/features/evidence/EvidenceManagement';
import DashboardMetrics from './components/features/dashboard/DashboardMetrics';
import BugReportForm from './components/features/bugs/BugReportForm';
import EasterEggBug from './components/features/bugs/EasterEggBug';
import TestManagement from './components/features/testes/TestManagement';
import MenuTutorial from './components/common/MenuTutorial';
import Home from './components/features/home/Home';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket, TestStatus, User, UserRole, TicketPriority, BugReport, TicketStatus } from './types';
import { STATUS_CONFIG, PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from './constants';
import { FileCheck, AlertTriangle, Archive, Calendar, User as UserIcon, Layers, ListChecks, CheckCircle2, XCircle, AlertCircle, ShieldCheck, CheckCheck, FileText, X, Save, FileDown, Loader2, Clock, LayoutDashboard, Hash, ArrowRight, Download, Trash2, ChevronLeft, ChevronRight, ChevronDown, Lock, ClipboardCheck, Activity, History, Bug, Monitor } from 'lucide-react';
import { getBrazilCurrentDate, getBrazilDateString } from '@/utils/dateUtils';
import { getTicketAggregateStatus, getTicketStatusBadges } from '@/utils/ticketUtils';
import { executePdfGeneration } from '@/utils/pdfGenerator';
import PdfReportTemplate from '@/components/features/evidence/PdfReportTemplate';
import FloatingActionButtons from '@/components/features/evidence/FloatingActionButtons';
import PdfConfirmationModal from '@/components/features/evidence/PdfConfirmationModal';
import DeleteTicketModal from '@/components/features/evidence/DeleteTicketModal';
import TicketHistoryCarousel from '@/components/features/evidence/TicketHistoryCarousel';
import TestSettings from '@/components/features/testes/TestSettings';
import { supabase } from '@/services/supabaseClient';
import { saveEvidenceToSupabase, fetchEvidencesFromSupabase, deleteEvidenceFromSupabase, fetchEvidenceImages } from '@/utils/supabaseEvidenceService';
import ValidationModal from './components/common/ValidationModal';
import DiscardChangesModal from './components/common/DiscardChangesModal';

declare const html2pdf: any;

export interface WizardTriggerContext {
  mode: 'create' | 'edit';
  scenarioNumber: number;
  nextCaseNumber: number;
  ticketInfo: TicketInfo;
  evidenceId?: string;
  existingDetails?: TestCaseDetails;
}

const App: React.FC = () => {
  // --- AUTHENTICATION & USER STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'evidences' | 'dashboard'>('users');

  // --- MODULE STATE ---
  const [activeModule, setActiveModule] = useState<'HOME' | 'TICKET' | 'BUGS' | 'EVIDENCES' | 'TESTS' | 'TEST_SETTINGS'>('HOME');

  // --- DATA STATE ---
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [ticketHistory, setTicketHistory] = useState<ArchivedTicket[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  // Bug Report State
  const [bugReports, setBugReports] = useState<BugReport[]>([]);

  const [formKey, setFormKey] = useState(0);
  const [editingTicketInfo, setEditingTicketInfo] = useState<TicketInfo | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);

  const [users, setUsers] = useState<User[]>([]);

  // --- VALIDATION STATE ---
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Map Supabase roles to frontend roles - robust mapping
  const mapRoleFromDb = (roleName: string): UserRole => {
    const role = (roleName || '').trim().toUpperCase();
    if (role === 'ADMINISTRADOR' || role === 'ADMIN' || role.includes('ADMIN')) return 'ADMIN';
    return 'USER';
  };

  const loadUsersFromSupabase = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          acronym,
          full_name,
          is_active,
          is_analyst,
          test_column_settings,
          daily_goal,
          is_daily_goal_auto,
          user_roles (
            role_name
          )
        `)
        .order('acronym');

      if (data && !error) {
        const mappedUsers: User[] = data.map((p: any) => {
          let roleName = 'USER';
          if (Array.isArray(p.user_roles) && p.user_roles.length > 0) {
            roleName = p.user_roles[0].role_name;
          } else if (p.user_roles && !Array.isArray(p.user_roles)) {
            roleName = (p.user_roles as any).role_name;
          }
          return {
            id: p.id,
            acronym: p.acronym,
            name: p.full_name,
            role: mapRoleFromDb(roleName),
            isActive: p.is_active !== false,
            isAnalyst: p.is_analyst !== false, // Defaults to true if missing
            showEasterEgg: true, // Keeping default for now as requested by behavior consistency
            testColumnSettings: p.test_column_settings,
            dailyGoal: p.daily_goal !== null ? p.daily_goal : undefined,
            isDailyGoalAuto: p.is_daily_goal_auto !== null ? p.is_daily_goal_auto : undefined
          };
        });
        setUsers(mappedUsers);
      }
    } catch (err) {
      console.error("Failed to load users", err);
    }
  }, []);

  useEffect(() => {
    loadUsersFromSupabase();
  }, [loadUsersFromSupabase]);

  // --- USER HANDLERS ---
  const handleAddUser = async (newUser: UserFormData) => {
    try {
      // Correcting parameters order and role string
      const { error } = await supabase.rpc('create_user_by_admin', {
        p_acronym: newUser.acronym.toUpperCase(),
        p_name: newUser.name,
        p_password: newUser.password || '123456',
        p_role: newUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USER'
      });

      if (error) throw error;

      // Explicitly update profiles as a secondary safeguard to ensure correct names
      const { data: newProfile } = await supabase.from('profiles').select('id').eq('acronym', newUser.acronym.toUpperCase()).single();
      if (newProfile) {
        // Set analyst status explicitly bypassing RLS
        await supabase.rpc('set_user_analyst_status', { 
          target_user_id: newProfile.id, 
          analyst_status: newUser.isAnalyst !== false 
        });

        await supabase.from('profiles').update({
          full_name: newUser.name,
          acronym: newUser.acronym.toUpperCase()
        }).eq('id', newProfile.id);

        // Explicitly update or insert user_roles to bypass faulty RPC permission drop
        const roleStr = newUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USER';
        const { data: existingRole } = await supabase.from('user_roles').select('user_id').eq('user_id', newProfile.id).maybeSingle();
        if (existingRole) {
          await supabase.from('user_roles').update({ role_name: roleStr }).eq('user_id', newProfile.id);
        } else {
          await supabase.from('user_roles').insert({ user_id: newProfile.id, role_name: roleStr });
        }
      }

      // Optimistic user insertion for instant UI
      if (newProfile) {
        setUsers(prev => [...prev, {
          id: newProfile.id,
          acronym: newUser.acronym.toUpperCase(),
          name: newUser.name,
          role: newUser.role,
          isActive: true,
          isAnalyst: newUser.isAnalyst !== false,
          showEasterEgg: newUser.showEasterEgg !== false
        }]);
      }

      // Give Supabase triggers a moment to finish assignments
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadUsersFromSupabase();
    } catch (error: any) {
      alert("Erro ao criar usuário: " + error.message);
    }
  };

  const handleUpdateUser = async (updatedUser: UserFormData) => {
    if (!updatedUser.id) return;
    try {
      // Correcting parameters order and role string
      const { error } = await supabase.rpc('update_user_by_admin', {
        p_user_id: updatedUser.id,
        p_acronym: updatedUser.acronym.toUpperCase(),
        p_name: updatedUser.name,
        p_password: updatedUser.password || null,
        p_role: updatedUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USER',
        p_is_active: updatedUser.isActive !== false
      });

      if (error) throw error;

      // Update analyst status securely bypassing RLS
      await supabase.rpc('set_user_analyst_status', { 
        target_user_id: updatedUser.id, 
        analyst_status: updatedUser.isAnalyst !== false 
      });

      // Explicitly update profiles to prevent potential RPC swap bugs
      const updateResult = await supabase.from('profiles').update({
        full_name: updatedUser.name,
        acronym: updatedUser.acronym.toUpperCase()
      }).eq('id', updatedUser.id).select();

      // If updateResult returns 0 rows, let's warn the user that RLS blocked it (or it didn't find the user).
      if (updateResult.error) {
        console.error('Error updating profile explicitly:', updateResult.error);
      } else if (updateResult.data && updateResult.data.length === 0) {
        console.warn('Profile update affected 0 rows. RLS might be blocking this action for Admins.');
        // We might need to ask the user to configure RLS to allow Admins to update profiles.
      }

      // Explicitly update or insert user_roles to bypass faulty RPC permission drop
      const roleStr = updatedUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'USER';
      const { data: existingRole } = await supabase.from('user_roles').select('user_id').eq('user_id', updatedUser.id).maybeSingle();
      if (existingRole) {
        await supabase.from('user_roles').update({ role_name: roleStr }).eq('user_id', updatedUser.id);
      } else {
        await supabase.from('user_roles').insert({ user_id: updatedUser.id, role_name: roleStr });
      }

      // Optimistic update for instant UI feedback
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { 
        ...u, 
        name: updatedUser.name,
        acronym: updatedUser.acronym.toUpperCase(),
        isAnalyst: updatedUser.isAnalyst !== false,
        isActive: updatedUser.isActive !== false,
        role: updatedUser.role
      } : u));

      // Give Supabase triggers a moment to finish assignments
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Reload from DB to normalize state
      await loadUsersFromSupabase();

      if (currentUser?.id === updatedUser.id) {
        // Find the updated user in the new list to get exact DB values
        const myData = (await supabase.from('profiles').select('*, user_roles(role_name)').eq('id', updatedUser.id).single()).data;
        if (myData) {
          let roleName = 'USER';
          if (Array.isArray(myData.user_roles) && myData.user_roles.length > 0) {
            roleName = myData.user_roles[0].role_name;
          } else if (myData.user_roles && !Array.isArray(myData.user_roles)) {
            roleName = (myData.user_roles as any).role_name;
          }

          setCurrentUser({
            ...currentUser,
            acronym: myData.acronym,
            name: myData.full_name,
            role: mapRoleFromDb(roleName),
            isActive: myData.is_active !== false,
            isAnalyst: myData.is_analyst !== false
          });
        }
      }
    } catch (error: any) {
      alert("Erro ao atualizar usuário: " + error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este usuário permanentemente?")) return;
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { p_user_id: id });
      if (error) throw error;
      await loadUsersFromSupabase();
    } catch (err: any) {
      alert("Erro ao remover usuário: " + err.message);
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printingTicket, setPrintingTicket] = useState<ArchivedTicket | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<'PDF' | 'SAVE'>('PDF');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [savedTicketInfo, setSavedTicketInfo] = useState<TicketInfo | null>(null);
  const [savedEvidences, setSavedEvidences] = useState<EvidenceItem[]>([]);
  const [ticketInfoVersion, setTicketInfoVersion] = useState(0); // To trigger isDirty memo
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ type: 'MODULE' | 'CLOSE', module?: any, reset?: boolean } | null>(null);

  // State for Ticket Deletion
  const [ticketToDelete, setTicketToDelete] = useState<ArchivedTicket | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<any>(null); // Added formRef

  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);
  const formTicketInfoRef = useRef<TicketInfo | null>(null);

  // Define loadTickets in component scope so it can be called after deletion
  const loadTickets = React.useCallback(async () => {
    console.log("Loading tickets from Supabase...");
    const sbTickets = await fetchEvidencesFromSupabase();
    console.log("Tickets fetched from Supabase:", sbTickets);
    
    if (sbTickets && sbTickets.length > 0) {
      setTicketHistory(sbTickets);
    } else if (sbTickets && sbTickets.length === 0) {
      // If it's empty from Supabase, try local storage
      const storedTickets = localStorage.getItem('narnia_tickets');
      if (storedTickets) {
        const parsed = JSON.parse(storedTickets);
        console.log("Supabase empty, using local storage:", parsed.length);
        setTicketHistory(parsed);
      } else {
        setTicketHistory([]);
      }
    }
  }, []);

  // --- PERSISTENCE & INITIALIZATION ---
  // Helper for deep equality ignoring key order
  const isDeepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!isDeepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
  };

  // Calculate dirty state
  const isDirty = useMemo(() => {
    // If no analyst yet (pure initial state), not dirty
    if (!currentUser && !savedTicketInfo) return false;

    const currentInfo = formTicketInfoRef.current;
    if (!currentInfo) return false;

    // If it's a completely NEW ticket (no saved state)
    if (!savedTicketInfo && savedEvidences.length === 0) {
      const hasMeaningfulText = Boolean(
        currentInfo.ticketId || 
        currentInfo.ticketTitle || 
        currentInfo.requester || 
        currentInfo.clientSystem || 
        currentInfo.ticketDescription || 
        currentInfo.solution || 
        currentInfo.blockageReason ||
        (currentInfo.blockageImageUrls && currentInfo.blockageImageUrls.length > 0)
      );
      const hasItems = evidences.length > 0;
      return hasMeaningfulText || hasItems;
    }

    // For existing tickets, use order-independent deep comparison
    const itemsChanged = !isDeepEqual(evidences, savedEvidences);
    
    // We only care about info changes if the info itself is structurally different
    const infoChanged = !isDeepEqual(currentInfo, savedTicketInfo);

    return itemsChanged || infoChanged;
  }, [evidences, savedEvidences, savedTicketInfo, ticketInfoVersion, currentUser]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    // Check active sessions and sets the user
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              id,
              acronym,
              full_name,
              test_column_settings,
              test_filters_state,
              daily_goal,
              is_daily_goal_auto,
              last_active_date,
              user_roles (
                role_name
              )
            `)
            .eq('id', session.user.id)
            .single();

          if (profile) {
            // Evaluates if it is a new day and handles Daily Goals
            const todayDateString = getBrazilDateString().split(' ')[0]; // Gets YYYY-MM-DD
            let updatedDailyGoal = profile.daily_goal;
            const isAuto = profile.is_daily_goal_auto;
            let needsUpdate = false;

            if (profile.last_active_date !== todayDateString) {
                needsUpdate = true;
                // It is a new day. Check rule.
                if (!isAuto) {
                    updatedDailyGoal = 0; // Reset if not automatic
                }
                
                // Update Supabase to acknowledge the new day
                await supabase.from('profiles').update({
                    last_active_date: todayDateString,
                    daily_goal: updatedDailyGoal
                }).eq('id', session.user.id);
            }

            // Check if profile.user_roles is an array (to safeguard against missing types)
            let roleName = 'USER';
            if (Array.isArray(profile.user_roles) && profile.user_roles.length > 0) {
              roleName = profile.user_roles[0].role_name;
            } else if (profile.user_roles && !Array.isArray(profile.user_roles)) {
              roleName = (profile.user_roles as any).role_name;
            }

            setCurrentUser({
              id: profile.id,
              acronym: profile.acronym,
              name: profile.full_name,
              role: mapRoleFromDb(roleName),
              isActive: true, // Assuming active by default in this implementation
              showEasterEgg: true,
              testColumnSettings: profile.test_column_settings,
              testFilters: profile.test_filters_state,
              dailyGoal: updatedDailyGoal,
              isDailyGoalAuto: isAuto,
              lastActiveDate: todayDateString
            });
            setSavedTicketInfo(getDefaultTicketInfo(profile.acronym));
          }
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    // Listen to changes in auth state
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    // Load Tickets
    loadTickets();

    // Load Bugs
    const storedBugs = localStorage.getItem('narnia_bugs');
    if (storedBugs) {
      setBugReports(JSON.parse(storedBugs));
    }

    return () => {
      authListener.subscription.unsubscribe();
    };

  }, []);
  // Helper to generate default ticket info with analyst pre-filled
  const getDefaultTicketInfo = (userAcronym: string): TicketInfo => ({
    sprint: '',
    ticketId: '',
    isImprovement: false,
    ticketTitle: '',
    ticketSummary: '',
    clientSystem: '',
    requester: '',
    priority: TicketPriority.MEDIUM,
    errorOrigin: '',
    ticketStatus: TicketStatus.PENDING,
    analyst: userAcronym,
    requestDate: '',
    environment: '',
    environmentVersion: '',
    evidenceDate: getBrazilDateString(),
    ticketDescription: '',
    solution: '',
    blockageReason: undefined,
    blockageImageUrls: undefined
  });

  // Memoized default ticket info to prevent EvidenceForm from resetting on re-renders
  const defaultTicketInfo = useMemo(() => {
    return currentUser ? getDefaultTicketInfo(currentUser.acronym) : null;
  }, [currentUser?.acronym]);

  // --- AUTH HANDLERS ---
  const handleLogin = async (acronym: string, pass: string) => {
    setLoginError(null);
    setAuthLoading(true);

    try {
      // Fake domain to work with Supabase Email Auth
      const email = `${acronym.trim().toLowerCase()}@qaevidence.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      if (error) {
        setLoginError('Credenciais inválidas. Verifique sigla e senha.');
        console.error("Login erro:", error.message);
      }
    } catch (error) {
      setLoginError('Ocorreu um erro ao tentar logar.');
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setEvidences([]); // Clear current workspace
    setEditingTicketInfo(null);
    setEditingHistoryId(null);
    setSavedTicketInfo(null);
    setSavedEvidences([]);
    setShowAdminPanel(false);
    setAdminTab('users');
  };

  // --- EVIDENCE HANDLERS ---

  const handleAddEvidence = (newEvidence: Omit<EvidenceItem, 'id' | 'timestamp' | 'createdBy'>) => {
    if (!currentUser) return;

    const item: EvidenceItem = {
      ...newEvidence,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      createdBy: currentUser.acronym,
      ticketInfo: {
        ...newEvidence.ticketInfo,
        analyst: currentUser.acronym // Use Acronym instead of Name
      }
    };
    setEvidences([item, ...evidences]);
    setPdfError(null);
  };

  const handleWizardSave = async (items: Omit<EvidenceItem, 'createdBy'>[]): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Usuário não autenticado." };

    const itemsWithUser = items.map(item => ({
      ...item,
      createdBy: currentUser.acronym,
      ticketInfo: {
        ...item.ticketInfo,
        analyst: currentUser.acronym // Use Acronym instead of Name
      }
    }));

    let newEvidences = [...evidences];
    if (wizardTrigger?.mode === 'edit') {
      const updatedItem = itemsWithUser[0];
      newEvidences = evidences.map(ev => ev.id === updatedItem.id ? updatedItem : ev);
    } else {
      newEvidences = [...itemsWithUser, ...evidences];
    }

    // Ensure they maintain the correct screen and condition if we are adding to a scenario
    const caseItem = itemsWithUser[0];
    if (wizardTrigger && wizardTrigger.mode === 'create') {
      const parentCase = evidences.find(ev => ev.testCaseDetails?.scenarioNumber === wizardTrigger.scenarioNumber);
      if (parentCase && parentCase.testCaseDetails && caseItem.testCaseDetails) {
        caseItem.testCaseDetails.screen = parentCase.testCaseDetails.screen;
        // The items have already been put in newEvidences, so modifying the reference works,
        // but just to be safe let's remap it
        newEvidences = newEvidences.map(ev =>
          ev.id === caseItem.id ? caseItem : ev
        );
      }
    }

    // Prepare Supabase Payload
    const masterTicketInfo = formTicketInfoRef.current || newEvidences[0].ticketInfo;
    const today = getBrazilDateString();
    const finalTicketInfo = { ...masterTicketInfo, evidenceDate: today };

    const consistentEvidences = newEvidences.map(ev => ({
      ...ev,
      ticketInfo: finalTicketInfo,
      createdBy: currentUser.acronym
    }));

    const currentTicketId = editingHistoryId || crypto.randomUUID();

    const finalTicket: ArchivedTicket = {
      id: currentTicketId,
      ticketInfo: finalTicketInfo,
      items: consistentEvidences,
      archivedAt: Date.now(),
      createdBy: currentUser.acronym
    };

    const success = await saveEvidenceToSupabase(finalTicket);
    if (!success) {
      return { success: false, error: "Falha de conexão com base de dados ao salvar o caso." };
    }

    // Update Local States on Success
    setEvidences(newEvidences);

    let updatedHistory = [...ticketHistory];
    if (!editingHistoryId) {
      setEditingHistoryId(currentTicketId);
      updatedHistory = [finalTicket, ...ticketHistory];
    } else {
      updatedHistory = ticketHistory.map(t => t.id === currentTicketId ? finalTicket : t);
    }
    setTicketHistory(updatedHistory);

    setWizardTrigger(null);
    setPdfError(null);

    return { success: true };
  };
  const handleDeleteEvidence = (id: string) => {
    setEvidences(evidences.filter(e => e.id !== id));
  };

  const handleTicketInfoChange = useCallback((info: TicketInfo) => {
    formTicketInfoRef.current = info;
    setTicketInfoVersion(prev => prev + 1);
    if (pdfError) setPdfError(null);
  }, [pdfError]);

  const handleDeleteScenario = (scenarioNum: number) => {
    if (!window.confirm(`Tem certeza que deseja excluir todo o Cenário #${scenarioNum} e seus casos de teste?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setEvidences(prev => prev.filter(e => {
      // Keep items that don't belong to any scenario (manual)
      if (!e.testCaseDetails) return true;

      // Remove items that match the scenario number
      return Number(e.testCaseDetails.scenarioNumber) !== Number(scenarioNum);
    }));
  };

  const handleAddCase = (originId: string) => {
    const origin = evidences.find(e => e.id === originId);
    if (!origin || !origin.testCaseDetails) return;

    const scenarioNum = origin.testCaseDetails.scenarioNumber;

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
  };

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
  };

  const handleCancelEdit = () => {
    if (!editingHistoryId && evidences.length > 0) {
      if (!window.confirm('Tem certeza que deseja limpar todos os dados e reiniciar o fluxo?')) {
        return;
      }
    }

    setEditingHistoryId(null);
    setSavedTicketInfo(currentUser ? getDefaultTicketInfo(currentUser.acronym) : null);
    setSavedEvidences([]);
    setPdfError(null);
    formTicketInfoRef.current = null; // Explicitly clear the form reference

    setFormKey(prev => prev + 1); // Force remount of form

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- BUG REPORT HANDLERS ---
  const handleSaveBug = (bug: BugReport) => {
    if (bugReports.some(b => b.id === bug.id)) {
      setBugReports(prev => prev.map(b => b.id === bug.id ? bug : b));
    } else {
      setBugReports([bug, ...bugReports]);
    }
  };

  const handleDeleteBug = (id: string) => {
    setBugReports(prev => prev.filter(b => b.id !== id));
  };

  // --- ARCHIVE / HISTORY HANDLERS ---
  const handleOpenArchivedTicket = async (ticket: ArchivedTicket) => {
    if (evidences.length > 0 && !editingHistoryId) {
      if (!window.confirm("Você tem dados na tela atual que não foram salvos. Deseja realmente descartá-los para carregar este histórico?")) {
        return;
      }
    }

    // 1. Open form IMMEDIATELY with text data
    setEditingHistoryId(ticket.id);
    setEvidences(ticket.items);
    setEditingTicketInfo(ticket.ticketInfo);
    setSavedTicketInfo(ticket.ticketInfo);
    setSavedEvidences(ticket.items);
    formTicketInfoRef.current = ticket.ticketInfo;
    setWizardTrigger(null);
    setPdfError(null);
    setShowAdminPanel(false);
    setActiveModule('TICKET');
    setIsTicketFormOpen(true);
    setFormKey(prev => prev + 1);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Load images in background
    console.log("Loading images in background for ticket:", ticket.id);
    try {
      const imagesData = await fetchEvidenceImages(ticket.id);
      
      // Only proceed if still editing the SAME ticket
      if (formTicketInfoRef.current?.ticketId === ticket.ticketInfo.ticketId) {
        const updatedItems = ticket.items.map((item: EvidenceItem) => {
          const newItem = { ...item };
          const caseImage = imagesData.find(img => img.image_type === 'case' && img.case_id === item.id);
          if (caseImage) {
            newItem.imageUrl = caseImage.image_data;
          }

          if (newItem.testCaseDetails && newItem.testCaseDetails.steps) {
            newItem.testCaseDetails.steps = newItem.testCaseDetails.steps.map(step => {
              const stepImage = imagesData.find(img => 
                img.image_type === 'step' && 
                img.case_id === item.id && 
                img.step_number === step.stepNumber
              );
              if (stepImage) {
                return { ...step, imageUrl: stepImage.image_data };
              }
              return step;
            });
          }
          return newItem;
        });

        const updatedTicketInfo = { ...ticket.ticketInfo };
        const blockageImages = imagesData
          .filter(img => img.image_type === 'blockage')
          .map(img => img.image_data);
        
        if (blockageImages.length > 0) {
          updatedTicketInfo.blockageImageUrls = blockageImages;
        }

        setEvidences(updatedItems);
        setEditingTicketInfo(updatedTicketInfo);
        setSavedEvidences(updatedItems);
        setSavedTicketInfo(updatedTicketInfo);
      }
    } catch (error) {
      console.error("Error loading background images:", error);
    }
  };

  const handleDeleteArchivedTicket = (ticketId: string) => {
    const ticket = ticketHistory.find(t => t.id === ticketId);
    if (ticket) {
      setTicketToDelete(ticket);
    }
  };

  const handleDownloadArchivedPdf = async (ticket: ArchivedTicket) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      // Lazy load images for PDF generation
      const imagesData = await fetchEvidenceImages(ticket.id);
      
      // Create a deep copy
      const ticketWithImages = JSON.parse(JSON.stringify(ticket));
      
      // Map blockage images
      const blockageImages = imagesData
        .filter(img => img.image_type === 'blockage')
        .map(img => img.image_data);
      
      if (blockageImages.length > 0) {
        ticketWithImages.ticketInfo.blockageImageUrls = blockageImages;
      }

      // Map case and step images
      ticketWithImages.items = ticketWithImages.items.map((item: EvidenceItem) => {
        const caseImage = imagesData.find(img => img.image_type === 'case' && img.case_id === item.id);
        if (caseImage) {
          item.imageUrl = caseImage.image_data;
        }

        const stepImages = imagesData
          .filter(img => img.image_type === 'step' && img.case_id === item.id)
          .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
        
        if (stepImages.length > 0 && item.testCaseDetails) {
          item.testCaseDetails.steps = stepImages.map(img => ({
            stepNumber: img.step_number || 0,
            description: img.step_description || '',
            imageUrl: img.image_data
          }));
        }

        return item;
      });

      setPrintingTicket(ticketWithImages);

      setTimeout(() => {
        executePdfGeneration({
          isArchived: true,
          reportRef,
          currentUser,
          printingTicket: ticketWithImages,
          formTicketInfoRef: { current: ticketWithImages.ticketInfo },
          evidences: ticketWithImages.items,
          users,
          setShowPdfModal,
          setIsGeneratingPdf,
          setPrintingTicket,
          persistCurrentTicket
        });
      }, 100);
    } catch (error) {
      console.error("Error loading images for PDF:", error);
      alert("Erro ao carregar as imagens para o PDF.");
      setIsGeneratingPdf(false);
    }
  };

  // --- VALIDATION & SAVING LOGIC ---

  const validateTicketRequirements = (): boolean => {
    setPdfError(null);
    setInvalidFields([]);

    if (evidences.length === 0) {
      setPdfError("Adicione pelo menos um caso de teste antes de gerar o PDF.");
      return false;
    }

    const masterTicketInfo = formTicketInfoRef.current || evidences[0].ticketInfo;

    const requiredFields: { key: keyof TicketInfo; label: string }[] = [
      { key: 'ticketId', label: 'ID do Chamado' },
      { key: 'ticketTitle', label: 'Título do Chamado' },
      { key: 'sprint', label: 'Sprint' },
      { key: 'requester', label: 'Solicitante' },
      { key: 'analyst', label: 'Analista de Teste' },
      { key: 'requestDate', label: 'Data da Solicitação' },
      { key: 'clientSystem', label: 'Cliente / Sistema' },
      { key: 'environment', label: 'Ambiente do Commit / Teste' }
    ];

    const missingFields = requiredFields.filter(field => {
      const value = masterTicketInfo[field.key];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      setInvalidFields(missingFields.map(f => f.label));
      setShowValidationModal(true);
      return false;
    }

    return true;
  };

  const persistCurrentTicket = async () => {
    if (!currentUser) return;

    // Get latest info from form ref if available
    const masterTicketInfo = (formRef.current?.getTicketInfo ? formRef.current.getTicketInfo() : null) ||
      formTicketInfoRef.current ||
      (evidences.length > 0 ? evidences[0].ticketInfo : null);

    if (!masterTicketInfo) return;

    setIsSaving(true);
    try {
      // Check for wizard draft
      let currentEvidences = [...evidences];
      const wizardDraft = formRef.current?.getWizardDraft ? formRef.current.getWizardDraft() : null;

      if (wizardDraft) {
        // If we are editing, replace the existing one, otherwise add to list
        if (wizardTrigger?.mode === 'edit') {
          currentEvidences = currentEvidences.map(ev => ev.id === wizardDraft.id ? wizardDraft : ev);
        } else {
          // Only add if it's not already in the list (guarding against double adds)
          if (!currentEvidences.some(ev => ev.id === wizardDraft.id)) {
            currentEvidences = [wizardDraft, ...currentEvidences];
          }
        }
      }

      // UPDATE EVIDENCE DATE TO TODAY (Requirement: Save/Update always captures latest date in Brazil Time)
      const today = getBrazilDateString();
      const finalTicketInfo = { ...masterTicketInfo, evidenceDate: today };

      const consistentEvidences = currentEvidences.map(ev => ({
        ...ev,
        ticketInfo: finalTicketInfo,
        createdBy: currentUser.acronym
      }));

      let updatedTicketHistory = [...ticketHistory];
      let finalTicket: ArchivedTicket;

      if (editingHistoryId) {
        updatedTicketHistory = ticketHistory.map(t => {
          if (t.id === editingHistoryId) {
            return {
              ...t,
              ticketInfo: finalTicketInfo,
              items: consistentEvidences,
              archivedAt: Date.now(),
              createdBy: currentUser.acronym
            };
          }
          return t;
        });
        finalTicket = updatedTicketHistory.find(t => t.id === editingHistoryId)!;
      } else {
        finalTicket = {
          id: crypto.randomUUID(),
          ticketInfo: finalTicketInfo,
          items: consistentEvidences,
          archivedAt: Date.now(),
          createdBy: currentUser.acronym
        };
        updatedTicketHistory = [finalTicket, ...ticketHistory];
      }

      // Validate if we can reach Supabase
      const success = await saveEvidenceToSupabase(finalTicket);

      if (success) {
        setTicketHistory(updatedTicketHistory);

        // Show success feedback
        setIsSaveSuccess(true);
        setTimeout(() => setIsSaveSuccess(false), 3000);

        console.log('Evidence saved successfully to Supabase');

        // Mark as clean after successful save
        setSavedTicketInfo(finalTicketInfo);
        setSavedEvidences(consistentEvidences);

        return;
      } else {
        // Show error and do not clear form Data
        alert("Ocorreu um erro ao salvar a evidência no banco de dados. Tente novamente.");
        return;
      }
    } catch (err) {
      console.error('Error in persistCurrentTicket:', err);
      alert("Ocorreu um erro inesperado ao salvar. Verifique o console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEvidence = () => {
    if (isDirty) {
      setPendingNavigation({ type: 'CLOSE' });
      setShowDiscardModal(true);
      return;
    }
    
    executeCloseEvidence();
  };

  const executeCloseEvidence = () => {
    // Reset Workspace
    setEvidences([]);
    setWizardTrigger(null);
    setEditingHistoryId(null);
    if (currentUser) {
      const defaultInfo = getDefaultTicketInfo(currentUser.acronym);
      setEditingTicketInfo(defaultInfo);
      setSavedTicketInfo(defaultInfo);
    } else {
      setSavedTicketInfo(null);
    }
    setSavedEvidences([]);
    formTicketInfoRef.current = null;
    setIsTicketFormOpen(false);
    setFormKey(prev => prev + 1);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Button 1: Save & Close (Histórico) - Uses same modal flow as PDF
  const handleSaveAndClose = () => {
    // Validation removed as requested to allow saving drafts/incomplete data
    // if (!validateTicketRequirements()) return; 
    setConfirmationMode('SAVE');
    setShowPdfModal(true);
  };

  // Button 2: Generate PDF (and Save)
  const handlePdfFlow = () => {
    if (evidences.length === 0) {
      setPdfError("Não há evidências para gerar o PDF. Adicione pelo menos um caso.");
      return;
    }
    if (!validateTicketRequirements()) return;
    setConfirmationMode('PDF');
    setShowPdfModal(true);
  };

  const handleModalConfirm = () => {
    if (confirmationMode === 'PDF') {
      executePdfGeneration({
        isArchived: false,
        reportRef,
        currentUser,
        printingTicket,
        formTicketInfoRef,
        evidences,
        users,
        setShowPdfModal,
        setIsGeneratingPdf,
        setPrintingTicket,
        persistCurrentTicket
      });
    } else if (confirmationMode === 'SAVE') {
      persistCurrentTicket();
      setShowPdfModal(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;

    try {
      const success = await deleteEvidenceFromSupabase(ticketToDelete.id);
      if (success) {
        // Explicitly clear local state first for immediate UI feedback
        setTicketHistory(prev => prev.filter(t => t.id !== ticketToDelete.id));

        // Then reload from Supabase as requested to ensure consistency
        await loadTickets();

        // If we were editing this ticket, reset space
        if (editingHistoryId === ticketToDelete.id) {
          handleCloseEvidence();
        }

        setTicketToDelete(null);
      } else {
        alert("Erro ao excluir evidência do banco de dados.");
      }
    } catch (err) {
      console.error("Error confirming delete:", err);
      alert("Erro inesperado ao excluir evidência.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Consultando Sessão...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  const renderModuleContent = () => {
    if (activeModule === 'BUGS') {
      return (
        <div className="space-y-8 animate-fade-in flex flex-col items-center">
          <BugReportForm
            onSave={handleSaveBug}
            users={users} // Now works, `users` will be empty for now if not fetched, but typed correctly
            currentUser={currentUser}
          />
        </div>
      );
    }

    if (activeModule === 'TESTS') {
      return (
        <TestManagement 
          onOpenSettings={() => setActiveModule('TEST_SETTINGS')} 
          testColumnSettings={currentUser.testColumnSettings}
          user={currentUser}
          onUpdateUser={setCurrentUser}
        />
      );
    }

    if (activeModule === 'TEST_SETTINGS') {
      return (
        <TestSettings 
          onClose={() => setActiveModule('TESTS')} 
          user={currentUser}
          allUsers={users}
          onUpdateSettings={async (newSettings) => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ test_column_settings: newSettings })
                .eq('id', currentUser.id);

              if (error) throw error;

              setCurrentUser({
                ...currentUser,
                testColumnSettings: newSettings
              });
              
              // Opcional: Atualizar a lista local de usuários se precisar
              setUsers(users.map(u => u.id === currentUser.id ? { ...u, testColumnSettings: newSettings } : u));
            } catch (err: any) {
              alert("Erro ao salvar configurações de exibição: " + err.message);
            }
          }}
        />
      );
    }

    if (activeModule === 'HOME') {
      return (
        <Home 
          user={currentUser} 
          onNavigate={(module) => setActiveModule(module)} 
        />
      );
    }

    if (activeModule === 'EVIDENCES') {
      return (
        <UserEvidenceList
          tickets={ticketHistory}
          currentUser={currentUser}
          onOpenTicket={handleOpenArchivedTicket}
          onDownloadPdf={handleDownloadArchivedPdf}
          onDeleteTicket={handleDeleteArchivedTicket}
          isGeneratingPdf={isGeneratingPdf}
          printingTicketId={printingTicket?.id || null}
        />
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
        {!isTicketFormOpen ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed animate-fade-in">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <FileDown className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum chamado aberto</h2>
            <p className="text-slate-500 mb-8 max-w-sm text-center">
              Comece criando um novo registro de evidência de teste ou selecione um do histórico abaixo.
            </p>
            <button
              onClick={() => {
                setIsTicketFormOpen(true);
                const info = editingTicketInfo || defaultTicketInfo;
                setSavedTicketInfo(info);
                setSavedEvidences([]);
              }}
              className="group relative overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-4 text-white shadow-xl shadow-indigo-900/20 transition-all duration-300 hover:shadow-indigo-900/40 hover:-translate-y-1 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              <div className="relative flex items-center justify-center gap-2 font-bold text-base tracking-widest uppercase">
                <FileText className="w-5 h-5" />
                Novo Chamado
              </div>
            </button>
          </div>
        ) : (
          <>
            {/* Formulário Principal */}
            <EvidenceForm
              key={formKey}
              ref={formRef}
              evidences={evidences}
              onAdd={handleAddEvidence}
              onDeleteScenario={handleDeleteScenario}
              users={users}
              evidenceCount={evidences.length}
              initialTicketInfo={editingTicketInfo || defaultTicketInfo}
              wizardTrigger={wizardTrigger}
              onWizardSave={handleWizardSave}
              onClearTrigger={() => setWizardTrigger(null)}
              invalidFields={invalidFields}
              onTicketInfoChange={handleTicketInfoChange}
              onEditCase={handleEditCase}
              disabled={isGeneratingPdf || isSaving}
            />

            {/* Lista de Evidências */}
            {evidences.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-slide-up">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <EvidenceList
                      evidences={evidences}
                      onDelete={handleDeleteEvidence}
                      onAddCase={handleAddCase}
                      onEditCase={handleEditCase}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Floating Action Buttons */}
            <FloatingActionButtons
              evidencesCount={evidences.length}
              onSave={handleSaveAndClose}
              onPdf={handlePdfFlow}
              onClose={handleCloseEvidence}
              disabled={isGeneratingPdf || isSaving || !isDirty}
              pdfError={pdfError}
              isSaveSuccess={isSaveSuccess}
            />
          </>
        )}

        {/* Carrossel de Histórico */}
        {!isGeneratingPdf && ticketHistory.length > 0 && (
          <TicketHistoryCarousel
            ticketHistory={ticketHistory}
            onOpenTicket={handleOpenArchivedTicket}
            onDownloadPdf={handleDownloadArchivedPdf}
            onDeleteTicket={(ticket) => setTicketToDelete(ticket)}
            isHistoryExpanded={isHistoryExpanded}
            setIsHistoryExpanded={setIsHistoryExpanded}
          />
        )}
      </div>
    );
  };

  const isPdfMode = confirmationMode === 'PDF';
  const isPdfLocked = evidences.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        invalidFields={invalidFields}
      />

      <Header
        user={currentUser}
        onLogout={handleLogout}
        showAdminPanel={showAdminPanel}
        onToggleAdminPanel={() => {
          if (!showAdminPanel && currentUser.role === 'ADMIN') {
            setAdminTab('evidences');
          }
          setShowAdminPanel(!showAdminPanel);
        }}
        activeModule={activeModule}
        onMenuNavigate={(module, resetToNewTicket) => {
          if (isDirty) {
            setPendingNavigation({ type: 'MODULE', module, reset: resetToNewTicket });
            setShowDiscardModal(true);
            return;
          }
          setActiveModule(module);
          if (resetToNewTicket) {
            setIsTicketFormOpen(false);
            setSavedTicketInfo(currentUser ? getDefaultTicketInfo(currentUser.acronym) : null);
            setSavedEvidences([]);
          }
        }}
      />

      {/* EASTER EGG BUG */}
      <EasterEggBug
        userAcronym={currentUser?.acronym}
        enabled={currentUser?.showEasterEgg !== false}
      />

      <main className={`flex-grow w-full mx-auto ${activeModule === 'HOME' ? 'max-w-7xl px-4 sm:px-6 lg:px-8 py-0' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-10 pb-12'}`}>
        {currentUser && (
          <div className="mb-8 flex justify-between items-center hidden">
            {/* The inline module tabs were removed. Navigation happens in the Header Menu. */}
          </div>
        )}

        {showAdminPanel ? (
          currentUser?.role === 'ADMIN' ? (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAdminPanel(false)}
                    className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-xs mr-2 p-2 rounded-lg hover:bg-white transition-all shadow-sm border border-transparent hover:border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Painel Administrativo</h2>
                    <p className="text-sm text-slate-500 font-medium">Gestão centralizada do sistema</p>
                  </div>
                </div>

                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button
                    onClick={() => setAdminTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Usuários
                  </button>
                  <button
                    onClick={() => setAdminTab('evidences')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'evidences' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Evidências
                  </button>
                  <button
                    onClick={() => setAdminTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Dashboard
                  </button>
                </div>
              </div>

              <div className="p-6">
                {adminTab === 'users' && (
                  <UserManagement
                    users={users}
                    onAddUser={handleAddUser}
                    onDeleteUser={handleDeleteUser}
                    onUpdateUser={handleUpdateUser}
                    currentUserId={currentUser.id}
                  />
                )}
                {adminTab === 'evidences' && (
                  <EvidenceManagement
                    tickets={ticketHistory}
                    users={users}
                    onDeleteTicket={(t) => setTicketToDelete(t)}
                    currentUser={currentUser}
                    onOpenTicket={handleOpenArchivedTicket}
                  />
                )}
                {adminTab === 'dashboard' && (
                  <DashboardMetrics tickets={ticketHistory} users={users} currentUser={currentUser} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-200 p-8">
              <button
                onClick={() => setShowAdminPanel(false)}
                className="mb-6 flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Voltar para o Dashboard
              </button>
              <h2 className="text-xl font-bold mb-4">Meu Perfil</h2>
              <p className="text-slate-500">Em breve configurações de perfil.</p>
            </div>
          )
        ) : (
          renderModuleContent()
        )}

        <PdfConfirmationModal
          showPdfModal={showPdfModal}
          setShowPdfModal={setShowPdfModal}
          isPdfMode={isPdfMode}
          handleModalConfirm={handleModalConfirm}
        />

        <DeleteTicketModal
          ticketToDelete={ticketToDelete}
          setTicketToDelete={setTicketToDelete}
          handleConfirmDelete={handleConfirmDelete}
        />

        <DiscardChangesModal
          isOpen={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          onConfirm={() => {
            setShowDiscardModal(false);
            if (pendingNavigation) {
              if (pendingNavigation.type === 'CLOSE') {
                executeCloseEvidence();
              } else if (pendingNavigation.type === 'MODULE') {
                setActiveModule(pendingNavigation.module);
                if (pendingNavigation.reset) {
                  setIsTicketFormOpen(false);
                  setSavedTicketInfo(currentUser ? getDefaultTicketInfo(currentUser.acronym) : null);
                  setSavedEvidences([]);
                }
              }
              setPendingNavigation(null);
            }
          }}
        />

      </main>

      {/* HIDDEN PDF REPORT */}
      <PdfReportTemplate
        reportRef={reportRef}
        currentUser={currentUser}
        printingTicket={printingTicket}
        modalTicketInfo={formTicketInfoRef.current || (evidences.length > 0 ? evidences[0].ticketInfo : null)}
        pdfItems={printingTicket ? printingTicket.items : (evidences.length > 0 ? evidences : (formRef.current?.getWizardDraft() ? [formRef.current.getWizardDraft()] : []))}
        evidences={printingTicket ? printingTicket.items : (evidences.length > 0 ? evidences : (formRef.current?.getWizardDraft() ? [formRef.current.getWizardDraft()] : []))}
      />
      <MenuTutorial />
    </div>
  );
};

export default App;