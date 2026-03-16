import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log('[DEBUG] AuthProvider mounted. Supabase instance:', !!supabase)
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
                if (session?.user) {
                    await loadProfile(session.user.id)
                } else {
                    setLoading(false)
                }
            } catch (err) {
                console.error("Initial session error:", err)
                setLoading(false)
            }
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null)
                if (session?.user) {
                    await loadProfile(session.user.id)
                } else {
                    setProfile(null)
                    setLoading(false)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    async function loadProfile(userId) {
        try {
            // Corrige o problema de trava no carregamento inicial (Timeout de 3s)
            const { data, error } = await Promise.race([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout carregando perfil')), 3000))
            ])

            if (error) {
                console.warn('Erro ao carregar perfil:', error.message)
                setProfile(null)
            } else {
                setProfile(data)
            }
        } catch (err) {
            console.error('Falha crítica no loadProfile:', err.message)
            setProfile(null)
        } finally {
            setLoading(false)
        }
    }

    async function refreshProfile() {
        if (!user) return
        await loadProfile(user.id)
    }

    async function signUp(email, password, fullName, referralCode = null) {
        const metadata = { full_name: fullName };
        if (referralCode && referralCode.trim() !== '') {
            metadata.referred_by_code = referralCode.trim();
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        })
        
        if (error) throw error

        // Login automático após registro
        if (data?.user) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (signInError) throw signInError
        }

        return data
    }

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password
        })
        if (error) throw error
        return data
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setProfile(null)
    }

    async function updateProfile(updates) {
        if (!user) return
        const { data, error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
            .select()
            .single()
        if (error) throw error
        setProfile(data)
        return data
    }

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
        isAuthenticated: !!user,
        isProvider: profile?.role === 'provider',
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
