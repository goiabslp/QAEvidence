import React from 'react';
import { Bug, Crosshair } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto text-slate-400 relative z-50">
      <div className="w-full py-5 px-6 md:px-8">
        <div className="flex justify-between items-center">
             {/* Left: Bug Target Icon */}
             <div className="relative group cursor-default select-none opacity-30 hover:opacity-100 transition-opacity duration-300" title="Bug Hunter">
                <div className="relative flex items-center justify-center">
                    <Crosshair className="w-10 h-10 text-red-600 absolute opacity-80" />
                    <Bug className="w-5 h-5 text-slate-200 relative z-10" />
                </div>
             </div>

             {/* Right: Signature */}
             <div className="select-none opacity-30 hover:opacity-100 transition-opacity duration-300">
                <span className="text-2xl font-bold text-slate-200 tracking-tight">
                    QA Tester
                </span>
             </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;