
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Trash2, Plus, Shield, User as UserIcon, Key, X, Check, UserPlus, ShieldAlert } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
  currentUserId: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onDeleteUser, onUpdateUser, currentUserId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    acronym: '',
    name: '',
    password: '',
    role: 'USER'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.acronym && newUser.name && newUser.password && newUser.role) {
      onAddUser({
        id: crypto.randomUUID(),
        acronym: newUser.acronym.toUpperCase(),
        name: newUser.name,
        password: newUser.password,
        role: newUser.role as UserRole
      });
      setNewUser({ acronym: '', name: '', password: '', role: 'USER' });
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-indigo-600" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-sm text-slate-500 mt-1">Adicione e gerencie os acessos ao sistema.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            isAdding 
              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancelar' : 'Novo Usuário'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-indigo-50/50 border-b border-indigo-100 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1 ml-1">Sigla (3 Letras)</label>
              <input
                type="text"
                maxLength={3}
                value={newUser.acronym}
                onChange={e => setNewUser({...newUser, acronym: e.target.value.toUpperCase()})}
                className="w-full rounded-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 uppercase font-mono"
                placeholder="XXX"
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1 ml-1">Nome Completo</label>
              <input
                type="text"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full rounded-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1 ml-1">Senha</label>
              <input
                type="text"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full rounded-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Senha"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1 ml-1">Permissão</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                className="w-full rounded-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="USER">Usuário Comum</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button 
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
             >
                <Check className="w-4 h-4" /> Salvar Usuário
             </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 w-20">Sigla</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Permissão</th>
              <th className="px-6 py-4 w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                   <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono font-bold text-xs border border-slate-200">
                      {user.acronym}
                   </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">
                   {user.name}
                   {user.id === currentUserId && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">(Você)</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    user.role === 'ADMIN' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {user.role === 'ADMIN' ? <ShieldAlert className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                  </span>
                </td>
                <td className="px-6 py-4">
                   {user.id !== currentUserId && user.acronym !== 'ADM' && (
                      <button 
                        onClick={() => onDeleteUser(user.id)}
                        className="text-slate-300 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="Remover Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
