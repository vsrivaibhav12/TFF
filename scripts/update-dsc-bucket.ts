import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await sb.storage.updateBucket('dsc-files', {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/pkcs12',
      'application/x-pkcs12',
    ],
  });
  if (error) {
    console.error('Error updating bucket:', error);
    process.exit(1);
  }
  console.log('Bucket updated:', data);
}

main();
