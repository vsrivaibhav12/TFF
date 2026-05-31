import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('Fetching task_steps with source_sop_step_id or source_template_step_id...');
  const { data: steps, error } = await sb
    .from('task_steps')
    .select('id, source_sop_step_id, source_template_step_id, guidance_notes, description')
    .or('source_sop_step_id.not.is.null,source_template_step_id.not.is.null');

  if (error) {
    console.error('Failed to fetch task steps', error);
    process.exit(1);
  }

  console.log(`Found ${steps.length} task steps. Filtering for those missing guidance_notes...`);
  const toUpdate = steps.filter(s => !s.guidance_notes && !s.description);
  console.log(`Need to backfill ${toUpdate.length} steps.`);

  // Load all SOP steps
  const { data: sopSteps } = await sb.from('sub_service_sop_steps').select('id, guidance_notes, description');
  // Load all Template steps
  const { data: tmplSteps } = await sb.from('task_template_steps').select('id, guidance_notes, description');

  const sopMap = new Map((sopSteps || []).map(s => [s.id, s]));
  const tmplMap = new Map((tmplSteps || []).map(s => [s.id, s]));

  let updatedCount = 0;
  for (const step of toUpdate) {
    let newDesc = null;
    let newGuidance = null;
    
    if (step.source_sop_step_id && sopMap.has(step.source_sop_step_id)) {
      const source = sopMap.get(step.source_sop_step_id)!;
      newDesc = source.description;
      newGuidance = source.guidance_notes;
    } else if (step.source_template_step_id && tmplMap.has(step.source_template_step_id)) {
      const source = tmplMap.get(step.source_template_step_id)!;
      newDesc = source.description;
      newGuidance = source.guidance_notes;
    }

    if (newDesc || newGuidance) {
      await sb
        .from('task_steps')
        .update({
          description: newDesc || step.description,
          guidance_notes: newGuidance || step.guidance_notes,
        })
        .eq('id', step.id);
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled ${updatedCount} task steps.`);
}

main().catch(console.error);
