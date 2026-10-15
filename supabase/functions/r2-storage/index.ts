// Cloudflare R2 Storage Edge Function
// Generates presigned PUT URLs for admin uploads, presigned GET URLs for
// private reader assets (pages and songs), and handles object cleanup.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from 'npm:@aws-sdk/client-s3@^3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@^3';
import { handleStorage, StorageConfig } from '../_shared/r2Storage.ts';

const webOrigin = () => {
  try {
    return new URL(Deno.env.get('WEB_URL') ?? '').origin;
  } catch {
    return '*';
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': webOrigin(),
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// R2 Configuration from environment secrets
const r2Config: StorageConfig = {
  accountId: Deno.env.get('R2_ACCOUNT_ID') || '',
  accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') || '',
  secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') || '',
  bucketCovers: Deno.env.get('R2_BUCKET_COVERS') || 'covers',
  bucketPages: Deno.env.get('R2_BUCKET_PAGES') || 'pages',
  bucketSongs: Deno.env.get('R2_BUCKET_SONGS') || 'songs',
  publicUrlCovers: Deno.env.get('R2_PUBLIC_URL_COVERS') || '',
};

let s3Client: S3Client | null = null;
function getS3(): S3Client {
  if (!s3Client) {
    if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
      throw new Error('R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not configured.');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const input = await req.json().catch(() => ({}));
  const authHeader = req.headers.get('Authorization');

  try {
    const s3 = getS3();

    const result = await handleStorage(authHeader, input, {
      config: r2Config,
      getCaller: async (jwt) => {
        const { data } = await service.auth.getUser(jwt);
        return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
      },
      isAdmin: async (userId) => {
        const { data } = await service.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
        return !!data?.is_admin;
      },
      canReadStory: async (userId, storyId) => {
        // Run can_read_story check via RPC or story status check
        const { data, error } = await service.rpc('can_read_story', {
          p_user: userId,
          p_story: storyId,
        });
        if (!error && typeof data === 'boolean') return data;

        // Fallback: Check if story is free
        const { data: story } = await service.from('stories').select('is_free, status').eq('id', storyId).maybeSingle();
        if (story?.status === 'live' && story.is_free) return true;

        // Check if user has active subscription
        if (userId) {
          const { data: access } = await service.rpc('my_access', { p_user: userId });
          if (access?.tier === 'premium') return true;
        }

        return false;
      },
      getPresignedPutUrl: async (bucket, key, contentType, cacheControl) => {
        const cmd = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
          CacheControl: cacheControl || undefined,
        });
        return await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min upload window
      },
      getPresignedGetUrl: async (bucket, key, expiresInSeconds) => {
        const cmd = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        return await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
      },
      deleteObjects: async (bucket, keys) => {
        if (!keys.length) return [];
        const cmd = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((k) => ({ Key: k })) },
        });
        await s3.send(cmd);
        return keys;
      },
    });

    return jsonResponse(result.body, result.status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Storage operation failed';
    return jsonResponse({ error: message }, 500);
  }
});
