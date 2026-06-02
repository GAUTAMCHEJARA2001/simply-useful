import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a base64 string to a Supabase storage bucket.
 * @param base64Data The base64 string (with or without data:image/xxx;base64, prefix)
 * @param bucket The bucket name
 * @param folder Optional folder path
 * @returns The public URL of the uploaded image
 */
export const uploadBase64Image = async (base64Data: string, bucket: string, folder: string = ''): Promise<string> => {
  // 1. Clean the base64 string
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Content, 'base64');
  
  // 2. Determine file extension (default to png for base64)
  const extension = base64Data.includes('data:image/jpeg') ? 'jpg' : 'png';
  const fileName = `${folder ? folder + '/' : ''}${uuidv4()}.${extension}`;

  // 3. Upload to Supabase
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: `image/${extension}`,
      upsert: true
    });

  if (error) {
    console.error('❌ Supabase Upload Error:', error.message);
    throw new Error(`Failed to upload image to ${bucket}`);
  }

  // 4. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};
