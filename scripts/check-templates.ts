import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: tasks } = await sb.from('tasks').select('id, sub_service_id').is('task_template_id', null).not('sub_service_id', 'is', null);
  console.log(`Found ${tasks?.length} tasks with sub_service_id but no task_template_id.`);
  
  const subIds = [...new Set(tasks?.map(t => t.sub_service_id))];
  console.log(`These belong to ${subIds.length} unique sub-services.`);
  
  for (const sid of subIds) {
    const { data: tpls } = await sb.from('task_templates').select('id, name').eq('sub_service_id', sid).eq('is_deleted', false);
    console.log(`Sub-service ${sid} has ${tpls?.length} templates:`, tpls);
  }
}

main().catch(console.error);
