// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mlghdhrizyuqtkixedtx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZ2hkaHJpenl1cXRraXhlZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDAwNDEsImV4cCI6MjA4MzgxNjA0MX0.4CPmOgE5cEnqX8XGRV52dVyTOpc_J3Zb4F2xmB1b-O0'

export const supabase = createClient(supabaseUrl, supabaseKey)