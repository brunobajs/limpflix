// Componente: ProviderBookings
// Gerenciamento de agendamentos do prestador

import { useState } from 'react'
import { Calendar, Check, X, Clock, MessageCircle, Phone } from 'lucide-react'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
}

const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado'
}

export default function ProviderBookings({
  bookings,
  providerId,
  onStatusChange,
  onOpenChat
}) {
  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState(null)

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  const handleStatusChange = async (bookingId, newStatus) => {
    setProcessing(bookingId)
    try {
      await onStatusChange(bookingId, newStatus)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'confirmed', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-green text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Todos' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Lista de Agendamentos */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info do Cliente */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {booking.client_name || 'Cliente'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[booking.status]
                      }`}
                    >
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-500">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {booking.scheduled_date} às {booking.scheduled_time}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {booking.service_name}
                    </p>
                    {booking.client_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {booking.client_phone}
                      </p>
                    )}
                  </div>

                  {booking.total_amount && (
                    <p className="mt-2 font-semibold text-green">
                      R$ {booking.total_amount.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        disabled={processing === booking.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green text-white rounded-lg font-medium text-sm hover:bg-green-dark disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        disabled={processing === booking.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Recusar
                      </button>
                    </div>
                  )}

                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(booking.id, 'completed')}
                      disabled={processing === booking.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Marcar Concluído
                    </button>
                  )}

                  <button
                    onClick={() => onOpenChat(booking)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}