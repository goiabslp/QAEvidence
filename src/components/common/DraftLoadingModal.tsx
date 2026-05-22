import React, { useEffect, useState } from 'react';
import { Loader2, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DraftLoadingModalProps {
    isOpen: boolean;
}

const DraftLoadingModal: React.FC<DraftLoadingModalProps> = ({ isOpen }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            const intervals = [
                setTimeout(() => setStep(1), 600),
                setTimeout(() => setStep(2), 1200),
                setTimeout(() => setStep(3), 1800),
            ];
            return () => intervals.forEach(clearTimeout);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const steps = [
        { icon: <Database className="w-6 h-6" />, text: "Conectando ao banco de dados..." },
        { icon: <ShieldCheck className="w-6 h-6" />, text: "Gerando identificador único..." },
        { icon: <Loader2 className="w-6 h-6 animate-spin" />, text: "Reservando registro de rascunho..." },
        { icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />, text: "Quase pronto!" }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center justify-center border border-slate-200 animate-zoom-in text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-600 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-100 animate-ping opacity-20 rounded-full"></div>
                    {steps[step].icon}
                </div>
                
                <h3 className="text-xl font-black text-slate-800 mb-2">Preparando Chamado</h3>
                <p className="text-slate-500 font-medium h-6 transition-all duration-300">
                    {steps[step].text}
                </p>

                <div className="w-full bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DraftLoadingModal;
