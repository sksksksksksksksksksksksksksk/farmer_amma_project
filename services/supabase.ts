
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://qbdahuxzwdluhvocbocp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGFodXh6d2RsdWh2b2Nib2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjQ1NzQsImV4cCI6MjA4NTA0MDU3NH0.Eq2TBlLqjJ4Zff0c9efqZnrnbuWwfrXvq9kQfFyaAAA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
