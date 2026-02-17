import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Facebook, Instagram } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-navy text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo & Description */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-6 h-6 text-green" />
                            <span className="text-xl font-bold">
                                Limp<span className="text-green">Flix</span>
                            </span>
                        </Link>
                        <p className="text-white/60 text-sm leading-relaxed max-w-md">
                            O marketplace definitivo que conecta você com profissionais de limpeza confiáveis.
                            Encontre os melhores profissionais da sua região para qualquer serviço de limpeza.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="font-semibold mb-4 text-white/90">Links Rápidos</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/servicos" className="text-white/60 hover:text-green transition-colors text-sm">
                                    Serviços
                                </Link>
                            </li>
                            <li>
                                <Link to="/profissionais" className="text-white/60 hover:text-green transition-colors text-sm">
                                    Profissionais
                                </Link>
                            </li>
                            <li>
                                <Link to="/cadastro-profissional" className="text-white/60 hover:text-green transition-colors text-sm">
                                    Seja um Profissional
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-semibold mb-4 text-white/90">Contato</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-white/60 text-sm">
                                <Phone className="w-4 h-4 text-green" />
                                (19) 99506-0356
                            </li>
                            <li className="flex items-center gap-2 text-white/60 text-sm">
                                <Mail className="w-4 h-4 text-green" />
                                contato@limpflix.com
                            </li>
                            <li className="flex items-center gap-2 text-white/60 text-sm">
                                <MapPin className="w-4 h-4 text-green" />
                                Todo o Brasil
                            </li>
                        </ul>
                        <div className="flex gap-3 mt-4">
                            <a href="#" className="w-9 h-9 bg-white/10 hover:bg-green/20 rounded-lg flex items-center justify-center transition-all hover:scale-110">
                                <Facebook className="w-4 h-4 text-white/80" />
                            </a>
                            <a href="#" className="w-9 h-9 bg-white/10 hover:bg-green/20 rounded-lg flex items-center justify-center transition-all hover:scale-110">
                                <Instagram className="w-4 h-4 text-white/80" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Divider & Copyright */}
                <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/40 text-xs">
                        © {new Date().getFullYear()} LimpFlix. Todos os direitos reservados.
                    </p>
                    <div className="flex gap-4">
                        <Link to="/termos" className="text-white/40 hover:text-white/60 text-xs transition-colors">
                            Termos de Uso
                        </Link>
                        <Link to="/privacidade" className="text-white/40 hover:text-white/60 text-xs transition-colors">
                            Política de Privacidade
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
