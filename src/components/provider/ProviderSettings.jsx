// Componente: ProviderSettings
// Configurações do prestador

import { useState } from 'react'
import { Save, Loader2, Camera, MapPin, Building2, Phone, Mail } from 'lucide-react'

const SERVICE_OPTIONS = [
  'Limpeza de Sofá', 'Limpeza de Colchão', 'Limpeza de Carpete',
  'Limpeza de Cortinas', 'Limpeza de Pisos', "Limpeza de Caixa d'Água",
  'Limpeza de Vidros', 'Limpeza de Fachada', 'Limpeza Pós-Obra',
  'Impermeabilização', 'Faxina Residencial'
]

const STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

export default function ProviderSettings({
  provider,
  onSave,
  isSaving,
  onImageUpload
}) {
  const [editForm, setEditForm] = useState({
    trade_name: provider?.trade_name || '',
    legal_name: provider?.legal_name || '',
    cnpj: provider?.cnpj || '',
    bio: provider?.bio || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    city: provider?.city || '',
    state: provider?.state || 'SP',
    address: provider?.address || '',
    services_offered: provider?.services_offered || [],
    pix_key: provider?.pix_key || '',
    profile_image: provider?.profile_image || ''
  })

  const [uploading, setUploading] = useState(false)

  const handleServiceToggle = (service) => {
    setEditForm(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(editForm)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await onImageUpload(file)
      setEditForm(prev => ({ ...prev, profile_image: url }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Erro ao fazer upload da imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Editar Perfil
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {editForm.profile_image ? (
                <img
                  src={editForm.profile_image}
                  alt="Perfil"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-1.5 bg-green text-white rounded-full cursor-pointer hover:bg-green-dark">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <p className="font-medium text-gray-900">Foto de Perfil</p>
              <p className="text-sm text-gray-500">
                {uploading ? 'Enviando...' : 'Clique para alterar'}
              </p>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={editForm.trade_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, trade_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razão Social
              </label>
              <input
                type="text"
                value={editForm.legal_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, legal_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={editForm.cnpj}
                onChange={(e) => setEditForm(prev => ({ ...prev, cnpj: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none resize-none"
              placeholder="Conte um pouco sobre sua empresa e experiência..."
            />
          </div>

          {/* Localização */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={editForm.state}
                onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Serviços */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serviços Oferecidos
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SERVICE_OPTIONS.map(service => (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleServiceToggle(service)}
                  className={`p-2 text-sm rounded-lg border transition-all ${
                    editForm.services_offered.includes(service)
                      ? 'bg-green text-white border-green'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green'
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* PIX */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave PIX para recebimentos
            </label>
            <input
              type="text"
              value={editForm.pix_key}
              onChange={(e) => setEditForm(prev => ({ ...prev, pix_key: e.target.value }))}
              placeholder="CPF, CNPJ, email ou telefone"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green outline-none"
            />
          </div>

          {/* Botão Salvar */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green text-white rounded-xl font-semibold hover:bg-green-dark disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}