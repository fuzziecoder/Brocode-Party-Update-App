import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Vite uses import.meta.env for environment variables with VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
    throw new Error(
        "Missing environment variable: VITE_SUPABASE_URL. Create a .env.local file."
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        "Missing environment variable: VITE_SUPABASE_ANON_KEY. Create a .env.local file."
    );
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