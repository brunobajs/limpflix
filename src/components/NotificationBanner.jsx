import { useState, useEffect } from 'react'
import { Bell, X, Settings } from 'lucide-react'
import { requestNotificationPermission } from '../hooks/useNotifications'

export default function NotificationBanner({ user }) {
    const [permissionStatus, setPermissionStatus] = useState('default')
    const [notificationDismissed, setNotificationDismissed] = useState(false)

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission)
        }
    }, [])

    useEffect(() => {
        const dismissedAt = localStorage.getItem('notification_banner_dismissed')
        if (dismissedAt && Date.now() - parseInt(dismissedAt) < 86400000 * 7) {
            setNotificationDismissed(true)
        }
    }, [])

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission()
        setPermissionStatus(Notification.permission)
        if (granted) {
            alert('Notificações ativadas! Você será avisado quando receber mensagens ou orçamentos.')
        } else if (Notification.permission === 'denied') {
            alert('Notificações bloqueadas. Para ativar, vá nas configurações do navegador e permita notificações para este site.')
        }
    }

    const handleDismiss = () => {
        setNotificationDismissed(true)
        localStorage.setItem('notification_banner_dismissed', Date.now().toString())
    }

    const showBanner = !notificationDismissed && permissionStatus !== 'granted'

    if (!user) return null

    return (
        <>
            {showBanner && (
                <div className="bg-gradient-to-r from-green to-green-dark text-white p-4 shadow-lg animate-fade-in">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Ative as notificações!</p>
                                <p className="text-xs text-white/80">Receba alertas de mensagens e orçamentos em tempo real</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleEnableNotifications}
                                className="bg-white text-green px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                {permissionStatus === 'denied' ? 'Configurações' : 'Ativar Agora'}
                            </button>
                            <button onClick={handleDismiss} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
