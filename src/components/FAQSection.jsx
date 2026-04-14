import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Shield, DollarSign, Users, Award, Zap, BookOpen } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: "1. O que é a Limpflix e quanto custa participar?",
    answer: "A Limpflix funciona como uma \"vitrine nacional\" para o seu serviço. O cadastro é totalmente gratuito. Não cobramos mensalidade, taxa de inscrição ou fidelidade. A plataforma só ganha quando você ganha: retemos apenas uma taxa fixa de 10% sobre os serviços efetivamente realizados.",
    icon: Zap
  },
  {
    question: "2. Quem define o preço do meu serviço?",
    answer: "Você. Na Limpflix, você tem autonomia total. O orçamento é definido por você de acordo com o que considera justo. A plataforma não interfere nos seus preços, atuando apenas como a ponte tecnológica entre você e o cliente.",
    icon: DollarSign
  },
  {
    question: "3. Como funciona o pagamento e a minha segurança?",
    answer: "Todo o fluxo financeiro é integrado. O cliente realiza o pagamento antecipado, garantindo que o valor fique seguro. Assim que você concluir o serviço e marcá-lo como finalizado no sistema, o repasse via Pix é enviado imediatamente.\n\nDiferencial: Se você se deslocar e o cliente não estiver presente (o famoso \"bolo\"), a plataforma garante o repasse de 30% do valor para cobrir seus custos de deslocamento e tempo.",
    icon: Shield
  },
  {
    question: "4. Posso trazer meus próprios clientes para a plataforma?",
    answer: "Sim, e isso é muito vantajoso! Através do seu Link de Indicação, o cliente se torna \"vinculado\" a você. Sempre que ele precisar de um serviço, a plataforma recomendará prioritariamente o seu perfil. Além disso, oferecemos uma Recorrência Vitalícia: ao indicar novos clientes ou colegas prestadores, você recebe 2% sobre cada serviço que eles realizarem/contratarem para sempre (valor retirado da parte da plataforma).",
    icon: Users
  },
  {
    question: "5. Como sou avaliado e como consigo mais clientes?",
    answer: "Após cada serviço, o cliente avalia seu desempenho de 0 a 5 estrelas. Profissionais com melhores notas ganham destaque no nosso ranking regional. Além disso, temos parcerias estratégicas com administradoras de condomínios, imobiliárias e campanhas com influenciadores para garantir um volume constante de demanda para você.",
    icon: Award
  },
  {
    question: "6. A Limpflix já está operando em todo o Brasil?",
    answer: "Estamos em uma fase estratégica de lançamento. O sistema já foi testado com sucesso e agora estamos montando nossa base oficial de profissionais qualificados. Nosso foco é nacional, começando com uma base sólida de parceiros para que, ao iniciarmos o marketing pesado para os clientes, você já esteja pronto para atender.",
    icon: Sparkles
  },
  {
    question: "7. Qual é o diferencial técnico da plataforma?",
    answer: "A Limpflix nasceu com o suporte de especialistas com mais de 15 anos de experiência no setor (incluindo a expertise da SOS Limpeza). Em breve, lançaremos a Academia Limpflix, com cursos e certificações.\n\nProfissionais experientes: Têm prioridade em serviços técnicos e complexos.\nNovos profissionais: São direcionados para serviços essenciais (como faxina residencial), garantindo a satisfação do cliente em todos os níveis.",
    icon: BookOpen
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Guia do Prestador Limpflix
          </h2>
          <p className="text-gray-600 font-medium">
            Tudo o que você precisa saber para transformar sua rotina de trabalho
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${openIndex === index ? 'bg-green text-white' : 'bg-green/10 text-green'} transition-colors`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`font-bold text-navy ${openIndex === index ? 'text-green' : ''} transition-colors`}>
                    {item.question}
                  </span>
                </div>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <div 
                className={`px-6 transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}
              >
                <div className="pt-2 text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-50 mt-2">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-navy rounded-[2.5rem] text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">Pronto para crescer com a gente?</h3>
            <p className="text-white/70 mb-8">Faça seu cadastro e comece a receber orçamentos hoje mesmo.</p>
            <a 
              href="/cadastro-profissional" 
              className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white px-8 py-3.5 rounded-xl text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-green/25"
            >
              Quero Me Cadastrar
              <Zap className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
