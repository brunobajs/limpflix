import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
  console.log('Testing signup...')
  // ATENÇÃO: Use um email real ou desative "Confirm Email" no Supabase para evitar "bounces"
  const uniqueEmail = `test-client-${Date.now()}@gmail.com`
  const { data, error } = await supabase.auth.signUp({
    email: uniqueEmail,
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test Client',
        referred_by_code: '12345'
      }
    }
  })

  if (error) {
    console.error('Signup Error:', error)
  } else {
    console.log('Signup Success:', data.user?.id)
    
    // Cleanup if possible (requires service role, won't work with anon key)
  }
}

testSignup()
