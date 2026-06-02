import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBuckets() {
  const buckets = ['visit-photos', 'expense-receipts'];

  for (const bucketName of buckets) {
    console.log(`🔍 Checking bucket: ${bucketName}...`);
    const { data: list, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`❌ Error listing buckets:`, listError.message);
      return;
    }

    if (!list.find(b => b.name === bucketName)) {
      console.log(`🏗️ Creating bucket: ${bucketName}...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error(`❌ Error creating bucket ${bucketName}:`, createError.message);
      } else {
        console.log(`✅ Bucket ${bucketName} created successfully.`);
      }
    } else {
      console.log(`✅ Bucket ${bucketName} already exists.`);
    }
  }
}

createBuckets()
  .catch(e => console.error(e))
  .finally(() => console.log('🏁 Bucket setup complete.'));
