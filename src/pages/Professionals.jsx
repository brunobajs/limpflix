import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentPosition, sortByDistance } from '../lib/geo'
import {
    Search, MapPin, Star, Filter, ArrowUpDown,
    Phone, User, Loader2, Navigation, ChevronRight, Map as MapIcon, List
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SERVICE_OPTIONS = [
    'Limpeza de Sofá', 'Limpeza de Colchão', 'Limpeza de Carpete',
    'Limpeza de Cortinas', 'Limpeza de Pisos', "Limpeza de Caixa d'Água",
    'Limpeza de Vidros', 'Limpeza de Fachada', 'Limpeza Pós-Obra',
    'Impermeabilização', 'Faxina Residencial'
]

export default function Professionals() {
    const [searchParams] = useSearchParams()
    const { profile } = useAuth()
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [serviceFilter, setServiceFilter] = useState(searchParams.get('servico') || '')
    const [sortBy, setSortBy] = useState('rating')
    const [userLocation, setUserLocation] = useState(null)
    const [geoLoading, setGeoLoading] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [viewMode, setViewMode] = useState('list')

    useEffect(() => {
        const refCode = searchParams.get('ref')
        if (refCode && profile && !profile.referred_by_provider_id) {
            handleCaptureReferral(refCode)
        }
        loadProviders()
    }, [profile, searchParams])

    async function handleCaptureReferral(code) {
        try {
            await supabase.rpc('link_client_to_referrer', {
                client_id: profile.id,
                referral_code: code
            })
        } catch (err) {
            console.error('Error linking referral:', err)
        }
    }

    async function loadProviders() {
        setLoading(true)
        try {
            let query = supabase
                .from('service_providers')
                .select('*')
                .eq('status', 'approved')

            // Exclusivity Logic: If client was referred by a provider, only show that provider
            if (profile?.referred_by_provider_id) {
                query = query.eq('id', profile.referred_by_provider_id)
            }

            const { data, error } = await query.order('rating', { ascending: false })

            if (error) throw error
            setProviders(data || [])
        } catch (err) {
            console.error('Error loading providers:', err)
            // Use demo data if Supabase is not configured
            if (!profile?.referred_by_provider_id) {
                setProviders(getDemoProviders())
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleGeoLocation() {
        setGeoLoading(true)
        try {
            const pos = await getCurrentPosition()
            setUserLocation(pos)
            setSortBy('distance')
        } catch (err) {
            alert('Não foi possível obter sua localização. Verifique as permissões do navegador.')
        } finally {
            setGeoLoading(false)
        }
    }

    // Filter and sort
    let filtered = providers.filter(p => {
        const pCity = p.city || ''
        const pTrade = p.trade_name || ''
        const pResp = p.responsible_name || ''
        const pServices = p.services_offered || []

        const matchSearch = !search ||
            pTrade.toLowerCase().includes(search.toLowerCase()) ||
            pResp.toLowerCase().includes(search.toLowerCase())

        const matchCity = !cityFilter ||
            pCity.toLowerCase() === cityFilter.toLowerCase() ||
            pCity.toLowerCase().includes(cityFilter.toLowerCase())

        const matchService = !serviceFilter ||
            pServices.some(s => s.toLowerCase().includes(serviceFilter.toLowerCase()))

        return matchSearch && matchCity && matchService
    })

    if (userLocation && sortBy === 'distance') {
        filtered = sortByDistance(filtered, userLocation.latitude, userLocation.longitude)
    } else if (sortBy === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === 'reviews') {
        filtered.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0))
    }

    const cities = [...new Set(providers.map(p => p.city).filter(Boolean))].sort()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <section className="bg-gradient-to-br from-navy to-navy-light py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                                Profissionais de Limpeza
                            </h1>
                            <p className="text-white/70 text-lg">
                                Encontre os melhores profissionais verificados da sua região
                            </p>
                        </div>
                        <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 whitespace-nowrap">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-green text-white shadow-lg' : 'text-white/70 hover:text-white'}`}
                            >
                                <List className="w-4 h-4" />
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'map' ? 'bg-green text-white shadow-lg' : 'text-white/70 hover:text-white'}`}
                            >
                                <MapIcon className="w-4 h-4" />
                                Mapa
                            </button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome do profissional..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green shadow-lg"
                            />
                        </div>
                        <button
                            onClick={handleGeoLocation}
                            disabled={geoLoading}
                            className="flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg disabled:opacity-50"
                        >
                            {geoLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Navigation className="w-5 h-5" />
                            )}
                            Perto de mim
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3.5 rounded-xl font-semibold transition-all border border-white/20"
                        >
                            <Filter className="w-5 h-5" />
                            Filtros
                        </button>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="max-w-3xl mx-auto mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <select
                                    value={cityFilter}
                                    onChange={(e) => setCityFilter(e.target.value)}
                                    className="bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green"
                                >
                                    <option value="">Todas as cidades</option>
                                    {cities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <select
                                    value={serviceFilter}
                                    onChange={(e) => setServiceFilter(e.target.value)}
                                    className="bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green"
                                >
                                    <option value="">Todos os serviços</option>
                                    {SERVICE_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green"
                                >
                                    <option value="rating">Melhor avaliação</option>
                                    <option value="reviews">Mais avaliações</option>
                                    <option value="distance">Mais próximo</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Results */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-gray-600 text-sm">
                        <span className="font-semibold text-gray-900">{filtered.length}</span> profissional(is) encontrado(s)
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-green animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum profissional encontrado</h3>
                        <p className="text-gray-500">Tente ajustar os filtros ou buscar por outra região.</p>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {filtered.map((provider) => (
                            <ProviderCard key={provider.id} provider={provider} />
                        ))}
                    </div>
                ) : (
                    <div className="h-[600px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm animate-fade-in z-0 sticky top-20">
                        <MapContainer
                            center={userLocation ? [userLocation.latitude, userLocation.longitude] : [-23.5505, -46.6333]}
                            zoom={11}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            {userLocation && (
                                <Marker position={[userLocation.latitude, userLocation.longitude]}>
                                    <Popup>Você está aqui</Popup>
                                </Marker>
                            )}
                            {filtered.map(p => p.latitude && p.longitude && (
                                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                                    <Popup>
                                        <div className="p-1 min-w-[150px]">
                                            <h4 className="font-bold text-navy mb-1">{p.trade_name || p.responsible_name}</h4>
                                            <p className="text-xs text-gray-500 mb-2">{p.city}, {p.state}</p>
                                            <div className="flex items-center gap-1 mb-2">
                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                <span className="text-xs font-bold">{p.rating || '5.0'}</span>
                                            </div>
                                            <Link
                                                to={`/profissional/${p.id}`}
                                                className="block text-center bg-green text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-green-dark transition-colors"
                                            >
                                                Ver Perfil
                                            </Link>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                            <MapUpdater center={userLocation ? [userLocation.latitude, userLocation.longitude] : null} />
                        </MapContainer>
                    </div>
                )}
            </section>
        </div>
    )
}

function MapUpdater({ center }) {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13)
        }
    }, [center, map])
    return null
}

function ProviderCard({ provider }) {
    return (
        <Link
            to={`/profissional/${provider.id}`}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group block"
        >
            {/* Top colored bar */}
            <div className="h-1.5 bg-gradient-to-r from-green to-emerald-400"></div>

            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 bg-gradient-to-br from-navy to-navy-light rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                        {provider.profile_image ? (
                            <img src={provider.profile_image} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <span className="text-white font-bold text-xl">
                                {(provider.trade_name || provider.responsible_name || '?')[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate group-hover:text-green transition-colors">
                            {provider.trade_name || provider.responsible_name}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{provider.city}, {provider.state}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-semibold text-gray-800">{provider.rating?.toFixed(1) || '5.0'}</span>
                            <span className="text-gray-400 text-xs">({provider.total_reviews || 0} avaliações)</span>
                        </div>
                    </div>
                </div>

                {/* Services */}
                {provider.services_offered?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {provider.services_offered.slice(0, 3).map((service, i) => (
                            <span key={i} className="bg-green/10 text-green text-xs font-medium px-2.5 py-1 rounded-full">
                                {service}
                            </span>
                        ))}
                        {provider.services_offered.length > 3 && (
                            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                                +{provider.services_offered.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Distance */}
                {provider.distance !== undefined && provider.distance !== null && (
                    <div className="flex items-center gap-1.5 mt-3 text-navy text-sm font-medium">
                        <Navigation className="w-3.5 h-3.5" />
                        {provider.distance < 1
                            ? `${(provider.distance * 1000).toFixed(0)}m de você`
                            : `${provider.distance.toFixed(1)}km de você`
                        }
                    </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{provider.total_services || 0} serviços realizados</span>
                    </div>
                    <span className="flex items-center gap-1 text-green text-sm font-semibold group-hover:translate-x-1 transition-transform">
                        Ver perfil
                        <ChevronRight className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

// Demo data for when Supabase is not configured yet
function getDemoProviders() {
    return [
        {
            id: 'demo-1',
            trade_name: 'LimpezaPro São Paulo',
            responsible_name: 'João Silva',
            city: 'São Paulo',
            state: 'SP',
            rating: 4.9,
            total_reviews: 127,
            total_services: 350,
            services_offered: ['Limpeza de Sofá', 'Limpeza de Colchão', 'Impermeabilização'],
            latitude: -23.5505,
            longitude: -46.6333,
            bio: 'Profissional com mais de 10 anos de experiência em limpeza profissional.',
        },
        {
            id: 'demo-2',
            trade_name: 'CleanMax',
            responsible_name: 'Maria Santos',
            city: 'Rio de Janeiro',
            state: 'RJ',
            rating: 4.8,
            total_reviews: 89,
            total_services: 220,
            services_offered: ['Limpeza de Carpete', 'Limpeza de Pisos', 'Limpeza Pós-Obra'],
            latitude: -22.9068,
            longitude: -43.1729,
            bio: 'Equipe profissional atendendo toda a região metropolitana do Rio de Janeiro.',
        },
        {
            id: 'demo-3',
            trade_name: 'BH Clean',
            responsible_name: 'Carlos Oliveira',
            city: 'Belo Horizonte',
            state: 'MG',
            rating: 4.7,
            total_reviews: 65,
            total_services: 180,
            total_services: 180,
            services_offered: ['Limpeza de Vidros', 'Limpeza de Fachada', 'Faxina Residencial'],
            latitude: -19.9167,
            longitude: -43.9345,
            bio: 'Especialistas em limpeza de vidros e fachadas comerciais.',
        },
        {
            id: 'demo-4',
            trade_name: 'SuperLimp Curitiba',
            responsible_name: 'Ana Paula',
            city: 'Curitiba',
            state: 'PR',
            rating: 5.0,
            total_reviews: 43,
            total_services: 95,
            services_offered: ['Limpeza de Sofá', 'Limpeza de Cortinas', "Limpeza de Caixa d'Água"],
            latitude: -25.4284,
            longitude: -49.2733,
            bio: 'Atendimento diferenciado com produtos ecológicos.',
        },
        {
            id: 'demo-5',
            trade_name: 'Higitech',
            responsible_name: 'Roberto Lima',
            city: 'Campinas',
            state: 'SP',
            rating: 4.6,
            total_reviews: 112,
            total_services: 400,
            services_offered: ['Impermeabilização', 'Limpeza de Colchão', 'Limpeza de Sofá', 'Limpeza de Carpete'],
            latitude: -22.9056,
            longitude: -47.0608,
            bio: 'Mais de 400 serviços realizados com excelência.',
        },
        {
            id: 'demo-6',
            trade_name: 'AquaClean Brasília',
            responsible_name: 'Fernanda Costa',
            city: 'Brasília',
            state: 'DF',
            rating: 4.9,
            total_reviews: 78,
            total_services: 200,
            services_offered: ["Limpeza de Caixa d'Água", 'Limpeza de Pisos', 'Limpeza Pós-Obra'],
            latitude: -15.7975,
            longitude: -47.8919,
            bio: 'Especialistas em limpeza de caixa d\'água e pisos.',
        },
    ]
}
