import { supabase } from './supabase';

/**
 * Check if database tables exist
 * Returns true if all required tables exist, false otherwise
 */
export async function checkDatabaseSetup(): Promise<{
  isSetup: boolean;
  missingTables: string[];
  error?: string;
}> {
  const requiredTables = ['profiles', 'spots', 'invitations', 'payments', 'chat_messages', 'moments'];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      
      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          missingTables.push(table);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
        missingTables.push(table);
      }
    }
  }

  return {
    isSetup: missingTables.length === 0,
    missingTables,
  };
}

/**
 * Get setup instructions based on missing tables
 */
export function getSetupInstructions(missingTables: string[]): string {
  if (missingTables.length === 0) {
    return 'Database is properly set up!';
  }

  return `
⚠️ DATABASE SETUP REQUIRED ⚠️

Missing tables: ${missingTables.join(', ')}

To fix this:
1. Open your Supabase project dashboard
2. Go to "SQL Editor" (left sidebar)
3. Click "New Query"
4. Open the file "supabase_migration.sql" in your project
5. Copy ALL the SQL code
6. Paste it into Supabase SQL Editor
7. Click "Run" button (or press Ctrl+Enter)
8. Wait for "Success" message
9. Refresh this page

See QUICK_START.md for detailed instructions.
  `.trim();
}
