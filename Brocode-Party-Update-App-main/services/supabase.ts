import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Vite uses import.meta.env for environment variables with VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn(`Supabase credentials are not configured. 
    Please create a .env.local file with:
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});


// Helper to get environment variable (for backwards compatibility)
export const getEnvVar = (key: string, defaultValue: string = '') => {
    return import.meta.env[key] || defaultValue;
};