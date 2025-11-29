

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Trash2, Plus, User as UserIcon, X, Check, UserPlus, ShieldAlert, Pencil, Save, ShieldCheck, Type, Lock, KeyRound, Ban, CheckCircle2, Bug, BugOff } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
  currentUserId: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onDeleteUser, onUpdateUser, currentUserId }) => {
  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    acronym: '',
    name: '',
    password: '',
    role: 'USER' as UserRole,
    showEasterEgg: true
  });

  // Filter users: Admin sees all, User sees only themselves
  const visibleUsers = isAdmin ? users : users.filter(u => u.id === currentUserId);

  const resetForm = () => {
    setFormData({ acronym: '', name: '', password: '', role: 'USER', showEasterEgg: true });
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    if (!isAdmin) return;
    setEditingUser(null);
    setFormData({ acronym: '', name: '', password: '', role: 'USER', showEasterEgg: true });
    setIsFormOpen(true);
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      acronym: user.acronym,
      name: user.name,
      password: user.password,
      role: user.role,
      showEasterEgg: user.showEasterEgg !== false // Default to true if undefined
    });
    setIsFormOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    onUpdateUser({
        ...user,
        isActive: user.isActive === false ? true : false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // Update existing
      onUpdateUser({
        ...editingUser,
        acronym: formData.acronym,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        showEasterEgg: formData.showEasterEgg
      });
    } else if (isAdmin && formData.acronym && formData.name && formData.password) {
      // Create new (Admin only)
      onAddUser({
        id: crypto.randomUUID(),
        acronym: formData.acronym.toUpperCase(),
        name: formData.name,
        password: formData.password,
        role: formData.role,
        isActive: true,
        showEasterEgg: formData.showEasterEgg
      });
    }
    resetForm();
  };

  // MODERN STYLING CLASSES
  const inputWrapperClass = "relative group";
  const inputIconClass = "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10";
  
  // Updated input classes for modern 'soft' look, high contrast, and distinct interactivity
  const baseInputClass = "block w-full pl-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed shadow-sm hover:border-indigo-300 hover:bg-white";
  
  const inputClass = `${baseInputClass} pr-4`;
  
  const labelClass = "block text-xs font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider flex items-center gap-1.5";

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md mb-8">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isAdmin ? 'bg-indigo-100' : 'bg-blue-100'} shadow-sm`}>
                {isAdmin ? <UserPlus className="w-5 h-5 text-indigo-600" /> : <ShieldCheck className="w-5 h-5 text-blue-600" />}
            </div>
            {isAdmin ? 'Gerenciamento de Usuários' : 'Meu Perfil'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-11 font-medium">
             {isAdmin ? 'Adicione e gerencie os acessos ao sistema.' : 'Gerencie suas informações de acesso.'}
          </p>
        </div>
        
        {isAdmin && !isFormOpen && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        )}
        {isFormOpen && (
             <button
             onClick={resetForm}
             className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm bg-white text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-all border border-slate-200 hover:border-red-200 shadow-sm"
           >
             <X className="w-4 h-4" />
             Cancelar
           </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-8 bg-slate-50 border-b border-slate-200 animate-slide-down">
          <div className="max-w-4xl mx-auto">
            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* SIGLA - Row 1 (3 cols) */}
                <div className="md:col-span-3">
                  <label className={labelClass}>Sigla (3 Letras)</label>
                  <div className={inputWrapperClass}>
                      <div className={inputIconClass}>
                          <Type className="w-5 h-5" />
                      </div>
                      <input
                          type="text"
                          maxLength={3}
                          value={formData.acronym}
                          onChange={e => setFormData({...formData, acronym: e.target.value.toUpperCase()})}
                          disabled={!!editingUser && !isAdmin} 
                          className={`${inputClass} font-mono uppercase tracking-widest text-center`}
                          placeholder="XXX"
                          required
                      />
                      {!!editingUser && !isAdmin && (
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                              <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                      )}
                  </div>
                </div>

                {/* NOME - Row 1 (9 cols) */}
                <div className="md:col-span-9">
                  <label className={labelClass}>Nome Completo</label>
                  <div className={inputWrapperClass}>
                      <div className={inputIconClass}>
                          <UserIcon className="w-5 h-5" />
                      </div>
                      <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className={inputClass}
                          placeholder="Nome do usuário"
                          required
                      />
                  </div>
                </div>

                {/* SENHA - Row 2 (5 cols) */}
                <div className="md:col-span-5">
                  <label className={labelClass}>Senha de Acesso</label>
                  <div className={inputWrapperClass}>
                      <div className={inputIconClass}>
                          <KeyRound className="w-5 h-5" />
                      </div>
                      <input
                          type="text"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className={inputClass}
                          placeholder="Defina a senha"
                          required
                      />
                  </div>
                </div>

                {/* PERMISSÃO & BUG TOGGLE - Row 2 (7 cols) */}
                <div className="md:col-span-7">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* ROLE SELECTOR */}
                      <div>
                          <label className={labelClass}>Permissão</label>
                          <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-200">
                              <button
                                  type="button"
                                  onClick={() => isAdmin && setFormData({...formData, role: 'USER'})}
                                  disabled={!isAdmin}
                                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                      formData.role === 'USER'
                                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <UserIcon className="w-4 h-4" />
                                  USER
                              </button>
                              <button
                                  type="button"
                                  onClick={() => isAdmin && setFormData({...formData, role: 'ADMIN'})}
                                  disabled={!isAdmin}
                                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                      formData.role === 'ADMIN'
                                      ? 'bg-purple-100 text-purple-700 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <ShieldCheck className="w-4 h-4" />
                                  ADMIN
                              </button>
                          </div>
                      </div>

                      {/* BUG TOGGLE */}
                      <div>
                          <label className={labelClass}>Bug Animado (Mascote)</label>
                          <button
                              type="button"
                              onClick={() => setFormData({...formData, showEasterEgg: !formData.showEasterEgg})}
                              className={`w-full py-3.5 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all outline-none focus:ring-4 focus:ring-indigo-500/10 ${
                                  formData.showEasterEgg
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm hover:bg-emerald-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300'
                              }`}
                          >
                              {formData.showEasterEgg ? <Bug className="w-5 h-5" /> : <BugOff className="w-5 h-5" />}
                              {formData.showEasterEgg ? 'Ativado na Tela' : 'Desativado'}
                          </button>
                      </div>
                  </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end pt-6 border-t border-slate-200/60">
                <button 
                    type="submit"
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all flex items-center gap-2.5 shadow-xl hover:shadow-indigo-200 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    {editingUser ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />} 
                    {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-5 w-28">Sigla</th>
              <th className="px-6 py-5">Nome</th>
              <th className="px-6 py-5">Permissão</th>
              <th className="px-6 py-5 text-center">Bug</th>
              <th className="px-6 py-5 w-40 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleUsers.map(user => {
              const isActive = user.isActive !== false;
              const hasBug = user.showEasterEgg !== false;
              
              return (
              <tr key={user.id} className={`transition-colors group ${!isActive ? 'bg-slate-50/50 opacity-75 grayscale-[0.5]' : 'hover:bg-slate-50'}`}>
                <td className="px-6 py-4">
                   <span className={`px-3 py-2 rounded-xl font-mono font-bold text-xs border-2 shadow-sm ${
                       !isActive ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-100'
                   }`}>
                      {user.acronym}
                   </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">
                   {user.name}
                   {user.id === currentUserId && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold uppercase tracking-wide">(Você)</span>}
                   {!isActive && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-extrabold uppercase tracking-wide">INATIVO</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                    user.role === 'ADMIN' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {user.role === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                    {hasBug ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase">
                            <Bug className="w-3 h-3" /> ON
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase">
                            <BugOff className="w-3 h-3" /> OFF
                        </span>
                    )}
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                   <button 
                     onClick={() => handleStartEdit(user)}
                     className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-xl hover:bg-blue-50 active:bg-blue-100"
                     title="Editar Usuário"
                   >
                     <Pencil className="w-4 h-4" />
                   </button>
                   
                   {isAdmin && user.id !== currentUserId && (
                        <button
                            onClick={() => handleToggleStatus(user)}
                            className={`transition-colors p-2 rounded-xl ${
                                isActive 
                                ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100' 
                                : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100'
                            }`}
                            title={isActive ? "Desabilitar Acesso" : "Habilitar Acesso"}
                        >
                            {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                   )}

                   {isAdmin && user.id !== currentUserId && (
                      <button 
                        onClick={() => onDeleteUser(user.id)}
                        className="text-slate-300 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50 active:bg-red-100"
                        title="Remover Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {visibleUsers.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;