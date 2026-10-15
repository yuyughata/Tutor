import test from 'node:test';
import assert from 'node:assert/strict';
import { handleStorage } from '../functions/_shared/r2Storage.ts';

function createDeps(overrides = {}) {
  const calls = {
    putUrls: [],
    getUrls: [],
    deletes: [],
  };

  const config = {
    accountId: 'cf-account-123',
    accessKeyId: 'r2-key-abc',
    secretAccessKey: 'r2-secret-xyz',
    bucketCovers: 'genova-covers',
    bucketPages: 'genova-pages',
    bucketSongs: 'genova-songs',
    publicUrlCovers: 'https://covers.genova.app',
  };

  const deps = {
    config,
    getCaller: async (jwt) => {
      if (jwt === 'admin-jwt') return { id: 'admin-1', email: 'admin@custar.ng' };
      if (jwt === 'parent-jwt') return { id: 'parent-1', email: 'parent@custar.ng' };
      return null;
    },
    isAdmin: async (id) => id === 'admin-1',
    canReadStory: async (userId, storyId) => {
      if (storyId === 'free-story') return true;
      if (storyId === 'premium-story' && userId === 'parent-1') return true;
      return false;
    },
    getPresignedPutUrl: async (bucket, key, contentType, cacheControl) => {
      calls.putUrls.push({ bucket, key, contentType, cacheControl });
      return `https://${bucket}.r2.example.com/${key}?signed-put=true`;
    },
    getPresignedGetUrl: async (bucket, key, expiresIn) => {
      calls.getUrls.push({ bucket, key, expiresIn });
      return `https://${bucket}.r2.example.com/${key}?expires=${expiresIn}`;
    },
    deleteObjects: async (bucket, keys) => {
      calls.deletes.push({ bucket, keys });
      return keys;
    },
    ...overrides,
  };

  return { deps, calls };
}

test('upload: requires signed-in admin', async () => {
  const { deps } = createDeps();

  // No auth header
  const r1 = await handleStorage(null, {
    action: 'get_upload_url', bucket: 'covers', path: 's1/c.jpg', contentType: 'image/jpeg'
  }, deps);
  assert.equal(r1.status, 403);

  // Non-admin user
  const r2 = await handleStorage('Bearer parent-jwt', {
    action: 'get_upload_url', bucket: 'covers', path: 's1/c.jpg', contentType: 'image/jpeg'
  }, deps);
  assert.equal(r2.status, 403);
  assert.match(r2.body.error, /Only admins/);
});

test('upload: validates bucket, path, and contentType', async () => {
  const { deps } = createDeps();

  // Invalid bucket
  const r1 = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url', bucket: 'other', path: 's1/c.jpg', contentType: 'image/jpeg'
  }, deps);
  assert.equal(r1.status, 400);

  // Path traversal
  const r2 = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url', bucket: 'covers', path: '../secret.jpg', contentType: 'image/jpeg'
  }, deps);
  assert.equal(r2.status, 400);

  // Invalid image type for cover
  const r3 = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url', bucket: 'covers', path: 's1/c.pdf', contentType: 'application/pdf'
  }, deps);
  assert.equal(r3.status, 400);

  // Invalid audio type for song
  const r4 = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url', bucket: 'songs', path: 's1/song.wav', contentType: 'audio/wav'
  }, deps);
  assert.equal(r4.status, 400);
});

test('upload: successfully generates presigned PUT URL and public cover URL', async () => {
  const { deps, calls } = createDeps();

  const res = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url',
    bucket: 'covers',
    path: 'story-123/cover.webp',
    contentType: 'image/webp',
    cacheControl: '31536000'
  }, deps);

  assert.equal(res.status, 200);
  assert.equal(res.body.uploadUrl, 'https://genova-covers.r2.example.com/story-123/cover.webp?signed-put=true');
  assert.equal(res.body.publicUrl, 'https://covers.genova.app/story-123/cover.webp');
  assert.equal(calls.putUrls.length, 1);
  assert.equal(calls.putUrls[0].bucket, 'genova-covers');
});

test('upload: generates presigned PUT URL for pages and songs without public URL', async () => {
  const { deps } = createDeps();

  const pageRes = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url',
    bucket: 'pages',
    path: 'story-123/page-1.png',
    contentType: 'image/png'
  }, deps);
  assert.equal(pageRes.status, 200);
  assert.equal(pageRes.body.publicUrl, null);

  const songRes = await handleStorage('Bearer admin-jwt', {
    action: 'get_upload_url',
    bucket: 'songs',
    path: 'story-123/theme.mp3',
    contentType: 'audio/mpeg'
  }, deps);
  assert.equal(songRes.status, 200);
  assert.equal(songRes.body.publicUrl, null);
});

test('read single asset: checks authorization', async () => {
  const { deps } = createDeps();

  // Anonymous reader requesting free story asset: allowed
  const r1 = await handleStorage(null, {
    action: 'get_signed_url', bucket: 'songs', path: 'free-story/song.mp3'
  }, deps);
  assert.equal(r1.status, 200);
  assert.match(r1.body.signedUrl, /expires=3600/);

  // Anonymous reader requesting premium story asset: rejected
  const r2 = await handleStorage(null, {
    action: 'get_signed_url', bucket: 'songs', path: 'premium-story/song.mp3'
  }, deps);
  assert.equal(r2.status, 403);

  // Subscribed parent requesting premium story asset: allowed
  const r3 = await handleStorage('Bearer parent-jwt', {
    action: 'get_signed_url', bucket: 'songs', path: 'premium-story/song.mp3'
  }, deps);
  assert.equal(r3.status, 200);

  // Admin requesting any story asset: allowed
  const r4 = await handleStorage('Bearer admin-jwt', {
    action: 'get_signed_url', bucket: 'songs', path: 'locked-story/song.mp3'
  }, deps);
  assert.equal(r4.status, 200);
});

test('read batch assets: generates signed URLs for multiple pages', async () => {
  const { deps, calls } = createDeps();

  const res = await handleStorage('Bearer parent-jwt', {
    action: 'get_signed_urls',
    bucket: 'pages',
    paths: ['free-story/p1.png', 'free-story/p2.png', 'premium-story/p1.png']
  }, deps);

  assert.equal(res.status, 200);
  assert.equal(res.body.urls.length, 3);
  assert.equal(calls.getUrls.length, 3);
});

test('delete: requires admin and deletes objects in target bucket', async () => {
  const { deps, calls } = createDeps();

  const r1 = await handleStorage('Bearer parent-jwt', {
    action: 'delete_objects', bucket: 'pages', paths: ['s1/p1.png']
  }, deps);
  assert.equal(r1.status, 403);

  const r2 = await handleStorage('Bearer admin-jwt', {
    action: 'delete_objects', bucket: 'pages', paths: ['s1/p1.png', 's1/p2.png']
  }, deps);
  assert.equal(r2.status, 200);
  assert.deepEqual(r2.body.deleted, ['s1/p1.png', 's1/p2.png']);
  assert.equal(calls.deletes[0].bucket, 'genova-pages');
});
