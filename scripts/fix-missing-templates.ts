import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: tasks } = await sb.from('tasks').select('id, sub_service_id').is('task_template_id', null).not('sub_service_id', 'is', null);
  console.log(`Found ${tasks?.length || 0} tasks with sub_service_id but no task_template_id.`);
  if (!tasks || tasks.length === 0) return;
  
  const subIds = [...new Set(tasks.map(t => t.sub_service_id))];
  console.log(`These belong to ${subIds.length} unique sub-services.`);
  
  let fixedCount = 0;
  
  for (const sid of subIds) {
    const { data: tpls } = await sb.from('task_templates').select('id, title').eq('sub_service_id', sid).eq('is_deleted', false).order('title').limit(1);
    
    if (tpls && tpls.length > 0) {
      const templateId = tpls[0].id;
      const tasksToFix = tasks.filter(t => t.sub_service_id === sid);
      
      console.log(`Fixing ${tasksToFix.length} tasks for sub-service ${sid} using template "${tpls[0].title}" (${templateId})`);
      
      for (const t of tasksToFix) {
        // Update task with template ID
        await sb.from('tasks').update({ task_template_id: templateId }).eq('id', t.id);
        
        // Seed steps from template
        const { data: existing } = await sb.from('task_steps').select('id', { head: true, count: 'exact' }).eq('task_id', t.id);
        if (!existing || (existing as any).length === 0) {
          const { data: steps } = await sb.from('task_template_steps').select('step_order, title, description, is_required, guidance_notes, id').eq('task_template_id', templateId).eq('is_deleted', false).order('step_order');
          if (steps && steps.length > 0) {
            const rows = steps.map(s => ({
              task_id: t.id,
              step_order: s.step_order,
              title: s.title,
              description: s.description,
              is_required: s.is_required,
              guidance_notes: s.guidance_notes,
              source_template_step_id: s.id,
            }));
            await sb.from('task_steps').insert(rows);
          }
        }
        fixedCount++;
      }
    } else {
      console.log(`No templates found for sub-service ${sid}. Skipping its tasks.`);
    }
  }
  
  console.log(`Successfully fixed ${fixedCount} tasks.`);
}

main().catch(console.error);
