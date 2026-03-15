// Componente: ProviderOverview
// Dashboard inicial do prestador com estatísticas

import { TrendingUp, Clock, DollarSign, Award, Users } from 'lucide-react'

export default function ProviderOverview({ provider, bookings }) {
  // Calcular estatísticas
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const totalEarnings = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.provider_amount || 0), 0)

  const stats = [
    {
      label: 'Pendentes',
      value: pendingBookings,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      label: 'Confirmados',
      value: confirmedBookings,
      icon: Award,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      label: 'Concluídos',
      value: completedBookings,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      label: 'Ganhos',
      value: `R$ ${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Olá, {provider?.trade_name || provider?.responsible_name || 'Prestador'}!
          </h2>
          <p className="text-gray-500 mt-1">
            Bem-vindo ao seu painel de controle
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Agendamentos Recentes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Agendamentos Recentes
        </h3>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum agendamento ainda</p>
            <p className="text-sm mt-1">Seus agendamentos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.client_name || 'Cliente'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.service_name} • {booking.scheduled_date}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : booking.status === 'confirmed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {booking.status === 'pending'
                    ? 'Pendente'
                    : booking.status === 'confirmed'
                    ? 'Confirmado'
                    : 'Concluído'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dica */}
      <div className="bg-gradient-to-r from-green/10 to-blue-50 rounded-2xl p-6 border border-green/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 text-green flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900">Dica do dia</h4>
            <p className="text-sm text-gray-600 mt-1">
              Responda rapidamente aos orçamentos para aumentar suas chances de
              fechar negócio. Clientes preferem prestadores ágeis!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}