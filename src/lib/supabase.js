import { createClient } from '@supabase/supabase-js'

// Validação das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Configurações do Supabase ausentes!')
    console.error('Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
    throw new Error('Configuração do Supabase incompleta')
}

// Configuração do cliente com retry e timeout
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: window.localStorage
    },
    global: {
        headers: {
            'x-application-name': 'limpflix'
        }
    },
    db: {
        schema: 'public'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

// Singleton pattern para garantir uma única instância
export const supabase = supabaseClient

// Exporta também para o window para facilitar debug e prover fallback se necessário
if (typeof window !== 'undefined') {
    if (!window.supabase) {
        Object.defineProperty(window, 'supabase', {
            value: supabaseClient,
            writable: false,
            configurable: false
        });
    }
}

// Helper para verificar conexão
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1)
        if (error) throw error
        console.log('✅ Conexão com Supabase estabelecida')
        return true
    } catch (err) {
        console.error('❌ Erro na conexão com Supabase:', err.message)
        return false
    }
}
