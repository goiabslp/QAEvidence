import React, { useState, useEffect, useRef } from 'react';
import { X, Save, MessageSquare, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StructuredObservation } from '../../../types';

interface TestObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (observation: string) => void;
  initialValue?: string;
  isMandatory?: boolean;
  status?: string;
  userAcronym: string;
  userName: string;
}

const TestObservationModal: React.FC<TestObservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValue = '',
  isMandatory = false,
  status = '',
  userAcronym,
  userName
}) => {
  const [text, setText] = useState('');
  const [historyText, setHistoryText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(''); // Always clear input for new comment
      
      if (typeof initialValue === 'string' && initialValue.startsWith('[') && initialValue.endsWith(']')) {
        try {
          const parsed = JSON.parse(initialValue);
          if (Array.isArray(parsed)) {
            const converted = parsed.map((p: any) => `${p.userAcronym} - ${p.text} - ${new Date(p.timestamp).toLocaleDateString('pt-BR')}`).join('\n');
            setHistoryText(converted);
          } else {
            setHistoryText(initialValue);
          }
        } catch (e) {
          setHistoryText(initialValue);
        }
      } else {
        setHistoryText(initialValue);
      }
      
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    if (isMandatory && !text.trim()) {
      alert(`A observação é obrigatória para o status "${status}".`);
      return;
    }
    onSave(text.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Observação do Registro</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {isMandatory ? `Justificativa Obrigatória (${status})` : 'Notas Adicionais'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* User Info Card */}
              <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-indigo-200 shadow-sm text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Responsável</p>
                  <p className="text-sm font-black text-slate-700">{userAcronym} — {userName}</p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Insira seu comentário</label>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Descreva o motivo do erro, impedimento ou qualquer observação relevante..."
                  className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-slate-700 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-inner resize-none custom-scrollbar"
                />
              </div>

              {/* History Preview (if exists) */}
              {historyText && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Histrico do Registro</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {historyText}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-all uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
              >
                <Save className="w-4 h-4" />
                Salvar Observação
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TestObservationModal;
