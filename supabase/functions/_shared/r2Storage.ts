// Pure business logic for Cloudflare R2 storage integration.
// Handles generating presigned PUT URLs for admin uploads, presigned GET URLs
// for private reader access (pages, songs), and object cleanup.

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketCovers: string;
  bucketPages: string;
  bucketSongs: string;
  publicUrlCovers: string; // e.g. https://covers.genova.app or https://pub-xxx.r2.dev
}

export interface StorageDeps {
  getCaller: (jwt: string) => Promise<{ id: string; email: string | null } | null>;
  isAdmin: (id: string) => Promise<boolean>;
  canReadStory: (userId: string | null, storyId: string) => Promise<boolean>;
  getPresignedPutUrl: (bucket: string, key: string, contentType: string, cacheControl?: string) => Promise<string>;
  getPresignedGetUrl: (bucket: string, key: string, expiresInSeconds: number) => Promise<string>;
  deleteObjects: (bucket: string, keys: string[]) => Promise<string[]>;
  config: StorageConfig;
}

export type StorageAction =
  | { action: 'get_upload_url'; bucket: 'covers' | 'pages' | 'songs'; path: string; contentType: string; cacheControl?: string }
  | { action: 'get_signed_url'; bucket: 'pages' | 'songs'; path: string }
  | { action: 'get_signed_urls'; bucket: 'pages'; paths: string[] }
  | { action: 'delete_objects'; bucket: 'covers' | 'pages' | 'songs'; paths: string[] };

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3'];

function getBucketName(bucketKey: 'covers' | 'pages' | 'songs', config: StorageConfig): string {
  if (bucketKey === 'covers') return config.bucketCovers;
  if (bucketKey === 'pages') return config.bucketPages;
  if (bucketKey === 'songs') return config.bucketSongs;
  throw new Error(`Unknown bucket key: ${bucketKey}`);
}

export async function handleStorage(
  authHeader: string | null,
  body: unknown,
  deps: StorageDeps,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const req = body as Partial<StorageAction>;
  if (!req || typeof req !== 'object' || !req.action) {
    return { status: 400, body: { error: 'Missing action in request body.' } };
  }

  const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;
  const caller = jwt ? await deps.getCaller(jwt) : null;
  const isCallerAdmin = caller ? await deps.isAdmin(caller.id) : false;

  // 1. UPLOAD: Only admins can upload assets
  if (req.action === 'get_upload_url') {
    if (!caller || !isCallerAdmin) {
      return { status: 403, body: { error: 'Only admins can upload assets.' } };
    }
    const { bucket, path, contentType, cacheControl } = req;
    if (!bucket || !['covers', 'pages', 'songs'].includes(bucket)) {
      return { status: 400, body: { error: 'Invalid bucket. Must be covers, pages, or songs.' } };
    }
    if (!path || typeof path !== 'string' || path.includes('..') || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(path)) {
      return { status: 400, body: { error: 'Invalid object path format.' } };
    }
    if (!contentType || typeof contentType !== 'string') {
      return { status: 400, body: { error: 'Missing contentType.' } };
    }

    if (bucket === 'covers' || bucket === 'pages') {
      if (!ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase())) {
        return { status: 400, body: { error: 'Invalid image contentType. Must be JPG, PNG, WebP or GIF.' } };
      }
    } else if (bucket === 'songs') {
      if (!ALLOWED_AUDIO_TYPES.includes(contentType.toLowerCase())) {
        return { status: 400, body: { error: 'Invalid audio contentType. Must be audio/mpeg.' } };
      }
    }

    const r2Bucket = getBucketName(bucket, deps.config);
    const uploadUrl = await deps.getPresignedPutUrl(r2Bucket, path, contentType, cacheControl);
    
    let publicUrl: string | null = null;
    if (bucket === 'covers' && deps.config.publicUrlCovers) {
      const base = deps.config.publicUrlCovers.replace(/\/$/, '');
      publicUrl = `${base}/${path}`;
    }

    return {
      status: 200,
      body: { uploadUrl, path, publicUrl },
    };
  }

  // 2. READ SINGLE ASSET (pages or songs)
  if (req.action === 'get_signed_url') {
    const { bucket, path } = req;
    if (!bucket || !['pages', 'songs'].includes(bucket)) {
      return { status: 400, body: { error: 'Invalid bucket for signed url. Must be pages or songs.' } };
    }
    if (!path || typeof path !== 'string') {
      return { status: 400, body: { error: 'Missing object path.' } };
    }

    // Extract story ID from "<story_id>/<filename>"
    const storyId = path.split('/')[0];
    if (!storyId) {
      return { status: 400, body: { error: 'Invalid path format.' } };
    }

    // Admin can always read; otherwise check reader access
    if (!isCallerAdmin) {
      const allowed = await deps.canReadStory(caller?.id ?? null, storyId);
      if (!allowed) {
        return { status: 403, body: { error: 'You do not have access to read this story asset.' } };
      }
    }

    const r2Bucket = getBucketName(bucket, deps.config);
    const signedUrl = await deps.getPresignedGetUrl(r2Bucket, path, 3600);
    return { status: 200, body: { signedUrl, path } };
  }

  // 3. READ BATCH ASSETS (e.g. story pages)
  if (req.action === 'get_signed_urls') {
    const { bucket, paths } = req;
    if (bucket !== 'pages') {
      return { status: 400, body: { error: 'Batch signed URLs only supported for pages.' } };
    }
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 100) {
      return { status: 400, body: { error: 'paths must be an array of 1 to 100 paths.' } };
    }

    // Verify access for each story in paths
    const storyIds = [...new Set(paths.map((p) => String(p).split('/')[0]).filter(Boolean))];
    if (!isCallerAdmin) {
      for (const sId of storyIds) {
        const allowed = await deps.canReadStory(caller?.id ?? null, sId);
        if (!allowed) {
          return { status: 403, body: { error: `No access to story assets for story: ${sId}` } };
        }
      }
    }

    const r2Bucket = getBucketName('pages', deps.config);
    const urls = await Promise.all(
      paths.map(async (path) => ({
        path: String(path),
        signedUrl: await deps.getPresignedGetUrl(r2Bucket, String(path), 3600),
      })),
    );

    return { status: 200, body: { urls } };
  }

  // 4. DELETE: Only admins can delete objects
  if (req.action === 'delete_objects') {
    if (!caller || !isCallerAdmin) {
      return { status: 403, body: { error: 'Only admins can delete assets.' } };
    }
    const { bucket, paths } = req;
    if (!bucket || !['covers', 'pages', 'songs'].includes(bucket)) {
      return { status: 400, body: { error: 'Invalid bucket.' } };
    }
    if (!Array.isArray(paths) || paths.length === 0) {
      return { status: 200, body: { deleted: [] } };
    }

    const r2Bucket = getBucketName(bucket, deps.config);
    const safePaths = paths.map(String).filter((p) => !p.includes('..') && /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(p));
    const deleted = await deps.deleteObjects(r2Bucket, safePaths);
    return { status: 200, body: { deleted } };
  }

  return { status: 400, body: { error: `Unsupported action: ${(req as { action?: string }).action}` } };
}
