import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yymfcrjpjgggolrniazv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bWZjcmpwamdnZ29scm5pYXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjAzNDcsImV4cCI6MjA5MjAzNjM0N30.MqRbrywev0F_4x8QSPmsRGRtvtvhEqBainhb_3Q-Br8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = 'clothing-images';
