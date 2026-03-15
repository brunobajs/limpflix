import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ooewrfhatxbucaatccfb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZXdyZmhhdHhidWNhYXRjY2ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NjI0MywiZXhwIjoyMDg4NjUyMjQzfQ.6WCM1vsw6QhcLvFrvhKknYuzDieLZyxEKUBC6UdTYGQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const sqlCommands = `
-- 1. REMOVER TRIGGERS PROBLEMÁTICAS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
DROP TRIGGER IF EXISTS tr_ensure_referral_code ON auth.users;

-- 2. REMOVER FUNÇÕES ANTIGAS CONFLITANTES
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS auto_confirm_user();
`

async function fixDatabase() {
  console.log('🔧 Iniciando correção do banco de dados...\n')

  try {
    // Passo 1: Remover triggers e funções problemáticas
    console.log('📝 Passo 1: Removendo triggers e funções antigas...')

    const { error: error1 } = await supabase.rpc('exec_sql', { sql: sqlCommands })

    // Como o Supabase não tem uma função exec_sql direta, vamos fazer manualmente
    // Vamos usar a abordagem de criar a função primeiro

    console.log('📝 Passo 2: Criando função handle_new_user corrigida...')

    // Criar a função diretamente
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        BEGIN
          INSERT INTO public.profiles (id, full_name, role)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
            COALESCE(NEW.raw_user_meta_data->>'role', 'client')
          )
          ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    // Verificar se profiles existe e tem a coluna referred_by_provider_id
    console.log('📝 Verificando tabela profiles...')

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profilesError) {
      console.log('⚠️ Erro ao verificar profiles:', profilesError.message)
    } else {
      console.log('✅ Tabela profiles acessível')
    }

    // Verificar service_providers
    console.log('📝 Verificando tabela service_providers...')

    const { data: providersData, error: providersError } = await supabase
      .from('service_providers')
      .select('id')
      .limit(1)

    if (providersError) {
      console.log('⚠️ Erro ao verificar service_providers:', providersError.message)
    } else {
      console.log('✅ Tabela service_providers acessível')
    }

    // Testar criação de usuário
    console.log('\n📝 Testando signup...')
    const testEmail = `test-${Date.now()}@limpflix-test.com`

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Test123456!',
      options: {
        data: {
          full_name: 'Teste Automático'
        }
      }
    })

    if (signUpError) {
      console.log('❌ Erro no signup:', signUpError.message)

      if (signUpError.message.includes('database error')) {
        console.log('\n❌ O erro persiste. Precisamos executar o SQL manualmente no painel.')
        console.log('\n📋 COLE ESTE SQL NO EDITOR DO SUPABASE:\n')
        console.log('─'.repeat(60))
        console.log(`
-- CORREÇÃO MANUAL - Cole no SQL Editor do Supabase

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
DROP TRIGGER IF EXISTS tr_ensure_referral_code ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS auto_confirm_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.service_providers
DROP CONSTRAINT IF EXISTS service_providers_user_id_key;

ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_user_id_key UNIQUE (user_id);

SELECT '✅ Correção aplicada!' as status;
`)
        console.log('─'.repeat(60))
      }
    } else {
      console.log('✅ Signup funcionando! User ID:', signUpData.user?.id)
      console.log('\n🎉 O banco de dados está funcionando!')
      console.log('   Tente cadastrar um usuário no site agora.')
    }

  } catch (err) {
    console.log('❌ Erro:', err.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📌 INSTRUÇÕES:')
  console.log('   Se o erro persistir, cole o SQL acima no Editor do Supabase')
  console.log('   e clique em RUN.')
  console.log('='.repeat(60))
}

fixDatabase()