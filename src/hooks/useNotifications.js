import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useUnreadCount(user) {
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const calculateUnread = useCallback(async () => {
        if (!user) return 0

        try {
            const { data: providerData } = await supabase
                .from('service_providers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            let query = supabase
                .from('chat_conversations')
                .select('client_last_read_at, provider_last_read_at, last_message_at, provider_id')

            if (providerData) {
                query = query.or(
                    `and(client_id.eq.${user.id},deleted_by_client.eq.false),and(provider_id.eq.${providerData.id},deleted_by_provider.eq.false)`
                )
            } else {
                query = query
                    .eq('client_id', user.id)
                    .eq('deleted_by_client', false)
            }

            const { data: conversations } = await query

            if (!conversations) return 0

            let count = 0
            conversations.forEach(conv => {
                const isProvider = providerData && conv.provider_id === providerData.id
                const lastReadAt = isProvider ? conv.provider_last_read_at : conv.client_last_read_at
                
                if (conv.last_message_at && (!lastReadAt || new Date(conv.last_message_at) > new Date(lastReadAt))) {
                    count++
                }
            })

            return count
        } catch (err) {
            console.error('Error calculating unread:', err)
            return 0
        }
    }, [user])

    useEffect(() => {
        if (!user) {
            setUnreadCount(0)
            setLoading(false)
            return
        }

        const loadCount = async () => {
            setLoading(true)
            const count = await calculateUnread()
            setUnreadCount(count)
            setLoading(false)
        }

        loadCount()

        const channel = supabase
            .channel('unread-count-listener')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, async () => {
                const count = await calculateUnread()
                setUnreadCount(count)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, async () => {
                const count = await calculateUnread()
                setUnreadCount(count)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, calculateUnread])

    useEffect(() => {
        if (unreadCount > 0 && navigator.setAppBadge) {
            navigator.setAppBadge(unreadCount)
        } else if (navigator.clearAppBadge) {
            navigator.clearAppBadge()
        }
    }, [unreadCount])

    return { unreadCount, loading }
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications')
        return false
    }

    if (Notification.permission === 'granted') {
        return true
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    }

    return false
}

export async function showNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            vibrate: [200, 100, 200],
            ...options
        })
        
        notification.onclick = () => {
            window.focus()
            notification.close()
        }
        
        return notification
    }
    return null
}
