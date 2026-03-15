// Componente: ProviderWallet
// Gerenciamento de carteira e pagamentos do prestador

import { useState } from 'react'
import { Wallet, TrendingUp, Clock, DollarSign, ArrowDownCircle, AlertCircle } from 'lucide-react'

export default function ProviderWallet({
  provider,
  transactions,
  onWithdraw,
  isWithdrawing
}) {
  const walletBalance = provider?.wallet_balance || 0
  const pendingBalance = provider?.pending_balance || 0
  const totalEarnings = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [pixKey, setPixKey] = useState('')

  const handleWithdraw = async () => {
    if (!pixKey.trim()) {
      alert('Digite sua chave PIX')
      return
    }
    await onWithdraw(pixKey)
    setShowWithdraw(false)
    setPixKey('')
  }

  return (
    <div className="space-y-6">
      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Saldo Disponível */}
        <div className="bg-gradient-to-br from-green to-green-dark rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="font-medium">Saldo Disponível</span>
          </div>
          <p className="text-3xl font-bold">
            R$ {walletBalance.toFixed(2)}
          </p>
        </div>

        {/* Saldo Pendente */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="font-medium text-gray-700">Pendente</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            R$ {pendingBalance.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Liberação em até 7 dias</p>
        </div>

        {/* Total Ganho */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="font-medium text-gray-700">Total Ganho</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            R$ {totalEarnings.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Botão de Saque */}
      {walletBalance > 0 && (
        <button
          onClick={() => setShowWithdraw(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green text-white rounded-xl font-semibold hover:bg-green-dark transition-colors"
        >
          <ArrowDownCircle className="w-5 h-5" />
          Solicitar Saque
        </button>
      )}

      {/* Modal de Saque */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitar Saque</h3>

            <div className="bg-green/10 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Valor disponível para saque</p>
              <p className="text-2xl font-bold text-green">R$ {walletBalance.toFixed(2)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave PIX
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, CNPJ, email ou telefone"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
            </div>

            {provider?.pix_key && (
              <button
                onClick={() => setPixKey(provider.pix_key)}
                className="text-sm text-green hover:underline mb-4"
              >
                Usar minha chave cadastrada: {provider.pix_key}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="flex-1 px-4 py-3 bg-green text-white rounded-xl font-medium hover:bg-green-dark disabled:opacity-50"
              >
                {isWithdrawing ? 'Processando...' : 'Confirmar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Transações */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Transações</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma transação ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description || 'Serviço'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    transaction.type === 'credit'
                      ? 'text-green'
                      : 'text-red-500'
                  }`}
                >
                  {transaction.type === 'credit' ? '+' : '-'}R${' '}
                  {transaction.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aviso */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Sobre os saques</p>
          <p className="mt-1">
            Os saques são processados em até 2 dias úteis. O valor mínimo para saque é de R$ 20,00.
          </p>
        </div>
      </div>
    </div>
  )
}