import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Previne o prompt padrão do navegador
      e.preventDefault();
      // Guarda o evento para disparar depois
      setDeferredPrompt(e);
      // Mostra o nosso componente
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação nativo
    deferredPrompt.prompt();

    // Espera pela escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Limpa o prompt guardado
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer"
      onClick={handleInstallClick}
    >
      <div className="flex items-start gap-4">
        <div className="bg-green/10 p-2 rounded-lg">
          <img src="/logo-192.png" alt="LimpFlix" className="w-10 h-10 rounded-md object-cover" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm md:text-base">Instalar LimpFlix</h3>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Instale nosso aplicativo para ter acesso rápido e uma melhor experiência!
          </p>
          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-green text-white text-xs md:text-sm font-medium rounded-lg hover:bg-green-dark transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Baixar Agora
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-4 py-2 text-gray-500 text-xs md:text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors"
            >
              Depois
            </button>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
