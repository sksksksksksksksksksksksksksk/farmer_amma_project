
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://sxalqgejputrrrsbnkfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YWxxZ2VqcHV0cnJyc2Jua2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NzgyMDMsImV4cCI6MjA4NDQ1NDIwM30._lKq5JhFEbxDEjFkyR7sbdkTEtWj_t8mFRG3K7HhuHk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
