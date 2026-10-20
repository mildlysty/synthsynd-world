import { createClient } from '@supabase/supabase-js';

// Direct connection bypassing .env.local
const supabaseUrl = 'https://mlpzrqocuwsepundcqwa.supabase.co';
const supabaseKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scHpycW9jdXdzZXB1bmRjcXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTc3NzgsImV4cCI6MjEwNzk3Mzc3OH0.NIXYAMKfnu0smaDUMK1o6jDYVDUw35QqqIAF-mxBuro'; 

export const supabase = createClient(supabaseUrl, supabaseKey);