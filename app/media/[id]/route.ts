import { env } from 'cloudflare:workers';
import { ensureSchema } from '@/db/runtime';
import { getOptionalOwner } from '@/lib/owner-auth';

type MediaRow = {
  objectKey: string;
  kind: 'image' | 'video' | 'audio';
  originalName: string;
  mimeType: string;
  visibility: 'private' | 'public';
  postStatus: 'draft' | 'private' | 'public' | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureSchema();
  const { id } = await params;
  const media = await env.DB.prepare(
    [
      'SELECT m.object_key AS objectKey, m.kind, m.original_name AS originalName,',
      'm.mime_type AS mimeType, m.visibility, p.status AS postStatus',
      'FROM media m LEFT JOIN posts p ON p.id = m.post_id',
      'WHERE m.id = ? LIMIT 1',
    ].join(' '),
  )
    .bind(id)
    .first<MediaRow>();

  if (!media) return new Response('Not found', { status: 404 });

  const owner = await getOptionalOwner();
  const isPublic =
    media.visibility === 'public' &&
    media.postStatus === 'public' &&
    media.kind !== 'audio';
  if (!owner && !isPublic) return new Response('Not found', { status: 404 });

  const object = await env.FILES.get(media.objectKey);
  if (!object) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', media.mimeType || 'application/octet-stream');
  headers.set(
    'Cache-Control',
    isPublic ? 'public, max-age=3600' : 'private, no-store',
  );
  headers.set('ETag', object.httpEtag);
  if (url.searchParams.get('download') === '1') {
    headers.set(
      'Content-Disposition',
      "attachment; filename*=UTF-8''" + encodeURIComponent(media.originalName),
    );
  }
  return new Response(object.body, { headers });
}
