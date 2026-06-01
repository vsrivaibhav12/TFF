import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: tpls, error } = await sb.from('task_templates').select('id, name, sub_service_id');
  console.log("All templates:", tpls);
  if (error) console.error("Error:", error);
}

main().catch(console.error);
