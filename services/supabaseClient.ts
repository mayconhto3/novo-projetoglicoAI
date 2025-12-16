import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evgnmqmocqtwvhvmnsvq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Z25tcW1vY3F0d3Zodm1uc3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTY3NzgsImV4cCI6MjA3OTc5Mjc3OH0.SwOyqWpw8T84gJlOFHP5yPNTxlpfZhqPg4z6Wfz-1wc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);