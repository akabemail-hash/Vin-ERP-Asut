
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iytetwhjrghibyzhtqss.supabase.co';
const supabaseKey = 'sb_publishable_VwKET7_gtSoNEtiRrnVUcw_mlubjUsX';

export const supabase = createClient(supabaseUrl, supabaseKey);
