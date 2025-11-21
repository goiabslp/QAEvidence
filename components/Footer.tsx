import React from 'react';
import { Github, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto text-slate-400">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            <a href="#" className="hover:text-white transition-colors">
              <span className="sr-only">GitHub</span>
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <span className="sr-only">Security</span>
              <Shield className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-sm">
              &copy; {new Date().getFullYear()} QA Evidence Tracker. Todos os direitos reservados.
            </p>
            <p className="text-center text-xs text-slate-600 mt-2">
              Dados processados localmente. Imagens não são enviadas para servidores externos (exceto análise IA).
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;