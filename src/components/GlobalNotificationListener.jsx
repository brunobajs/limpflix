import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function GlobalNotificationListener() {
    const { user, profile } = useAuth()
    const [permission, setPermission] = useState('default')

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission)
            if (Notification.permission === 'default' || Notification.permission === 'prompt') {
                Notification.requestPermission().then(setPermission)
            }
        }
    }, [])

    function playSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, audioCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1)
            
            // Double beep
            setTimeout(() => {
                try {
                    const osc2 = audioCtx.createOscillator()
                    const gain2 = audioCtx.createGain()
                    osc2.connect(gain2)
                    gain2.connect(audioCtx.destination)
                    osc2.type = 'sine'
                    osc2.frequency.setValueAtTime(880, audioCtx.currentTime)
                    osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1)
                    gain2.gain.setValueAtTime(0.1, audioCtx.currentTime)
                    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
                    osc2.start()
                    osc2.stop(audioCtx.currentTime + 0.4)
                } catch(e) {}
            }, 150)

            gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
            osc.start()
            osc.stop(audioCtx.currentTime + 0.4)
        } catch (e) {
            console.error('Audio api failed', e)
        }
    }

    function showNotification(title, body, url) {
        if (permission === 'granted' && 'Notification' in window) {
            const notif = new Notification(title, {
                body,
                icon: '/logo-192.png',
                vibrate: [200, 100, 200]
            })
            notif.onclick = () => {
                window.focus()
                if (url) window.location.href = url
                notif.close()
            }
        }
    }

    useEffect(() => {
        if (!user?.id) return

        // Ouvi mensagens
        const messageChannel = supabase
            .channel(`global-messages-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                const msg = payload.new
                if (msg.sender_id !== user.id) {
                    playSound()
                    showNotification(
                        'Nova Mensagem', 
                        msg.message || 'Você tem uma nova mensagem', 
                        profile?.role === 'provider' ? '/dashboard' : '/cliente/dashboard'
                    )
                }
            })
            .subscribe()

        // Ouvi orçamentos
        const quoteChannel = supabase
            .channel(`global-quotes-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'service_quotes'
            }, (payload) => {
                const quote = payload.new
                if (profile?.role === 'client' && quote.client_id === user.id) {
                    playSound()
                    showNotification('Novo Orçamento!', `Valor: R$ ${quote.amount}`, '/cliente/dashboard')
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'service_quotes'
            }, (payload) => {
                const quote = payload.new
                if (profile?.role === 'provider' && quote.provider_id === profile?.id) {
                    if (quote.status === 'accepted' || quote.status === 'paid') {
                        playSound()
                        showNotification('Orçamento Aprovado!', `O cliente aceitou o orçamento de R$ ${quote.amount}.`, '/dashboard')
                    } else if (quote.status === 'rejected_by_other') {
                        showNotification('Vaga Preenchida', `O cliente escolheu outro profissional para este serviço.`, '/dashboard')
                    }
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(messageChannel)
            supabase.removeChannel(quoteChannel)
        }
    }, [user?.id, profile?.role, profile?.id, permission])

    return null
}
