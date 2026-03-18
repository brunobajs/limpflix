import { useState } from 'react'
import { 
    X, Search, Star, MessageSquare, 
    ArrowRight, CheckCircle2, ShieldCheck,
    Sparkles, ArrowLeft
} from 'lucide-react'

export default function UserOnboarding({ isOpen, onClose, onStart }) {
    const [step, setStep] = useState(1)

    if (!isOpen) return null

    const steps = [
        {
            icon: Search,
            title: "1. Escolha o Serviço",
            desc: "Selecione o tipo de limpeza que você precisa. Temos especialistas para sofás, tapetes, pós-obra e muito mais.",
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            icon: Star,
            title: "2. Veja as Avaliações",
            desc: "Confira fotos dos trabalhos e o que outros clientes dizem. Escolha o profissional que melhor te atende.",
            color: "text-yellow-500",
            bg: "bg-yellow-50"
        },
        {
            icon: MessageSquare,
            title: "3. Negocie no Chat",
            desc: "Ao solicitar o orçamento, abrimos um chat seguro. O cadastro rápido garante que suas fotos e mensagens fiquem protegidas.",
            color: "text-green",
            bg: "bg-green/10"
        }
    ]

    const currentStep = steps[step - 1]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up border border-white/20">
                {/* Header Area */}
                <div className="bg-gradient-to-br from-navy via-navy-light to-navy p-8 text-center relative">
                    <div className="absolute top-4 left-4 flex gap-1">
                        {[1, 2, 3].map((s) => (
                            <div 
                                key={s} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    s === step ? 'w-8 bg-green' : 'w-2 bg-white/20'
                                }`}
                            />
                        ))}
                    </div>

                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                        <currentStep.icon className={`w-8 h-8 ${currentStep.color}`} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h2>
                    <div className="flex items-center justify-center gap-2 text-green text-xs font-bold uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" />
                        <span>Dica LimpFlix</span>
                        <Sparkles className="w-3 h-3" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8">
                    <div className="min-h-[100px] text-center mb-8">
                        <p className="text-gray-600 leading-relaxed">
                            {currentStep.desc}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="w-full bg-navy hover:bg-navy-light text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                Próximo Passo
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onStart()
                                    onClose()
                                }}
                                className="w-full bg-green hover:bg-green-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Entendi, Vamos Começar!
                            </button>
                        )}

                        <div className="flex items-center justify-between mt-4">
                            {step > 1 ? (
                                <button 
                                    onClick={() => setStep(step - 1)}
                                    className="text-gray-400 hover:text-navy text-sm font-medium flex items-center gap-1 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            ) : (
                                <div />
                            )}
                            
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                <ShieldCheck className="w-3 h-3 text-green" />
                                AMBIENTE 100% SEGURO
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center mt-6">
                        Pule este guia a qualquer momento fechando o modal no (X).
                    </p>
                </div>
            </div>
        </div>
    )
}
