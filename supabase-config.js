// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
//
// Replace these with your own Supabase project
// URL and Publishable/Anon Key.
//
// DO NOT put your Supabase Service Role Key here.
// This file is frontend code and is visible
// to anyone using your website.
// ==========================================

const SUPABASE_URL = "https://zuwscpzwzrfmmzvelqgd.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_qpAPz5OSRXgfwzliJaqJqw_Lb6AS8qS";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);