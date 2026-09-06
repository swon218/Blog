import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { ensureSchema } from '@/db/runtime';
import { OwnerAccessError, requireApiOwner } from '@/lib/owner-auth';

const limits = {
  image: 20 * 1024 * 1024,
  audio: 120 * 1024 * 1024,
  video: 250 * 1024 * 1024,
};

export async function POST(request: Request) {
  try {
    await requireApiOwner();
    await ensureSchema();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '파일을 선택해 주세요.' },
        { status: 400 },
      );
    }

    const kind = resolveKind(file.type);
    if (!kind) {
      return NextResponse.json(
        { error: '이미지, 동영상 또는 오디오 파일만 첨부할 수 있습니다.' },
        { status: 400 },
      );
    }
    if (file.size > limits[kind]) {
      return NextResponse.json(
        { error: '파일 크기가 허용 범위를 초과했습니다.' },
        { status: 413 },
      );
    }

    const id = crypto.randomUUID();
    const extension = safeExtension(file.name, file.type);
    const objectKey = kind + '/' + id + extension;
    await env.FILES.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    const durationValue = Number(form.get('duration') ?? 0);
    await env.DB.prepare(
      'INSERT INTO media (id, post_id, object_key, kind, original_name, mime_type, file_size, duration, visibility, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        objectKey,
        kind,
        file.name || 'recording',
        file.type || 'application/octet-stream',
        file.size,
        Number.isFinite(durationValue) && durationValue > 0
          ? Math.round(durationValue)
          : null,
        'private',
        new Date().toISOString(),
      )
      .run();

    return NextResponse.json({
      id,
      kind,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      src: '/media/' + id,
      downloadUrl: '/media/' + id + '?download=1',
    });
  } catch (error) {
    if (error instanceof OwnerAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : '파일을 저장하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function resolveKind(type: string) {
  if (type.startsWith('image/')) return 'image' as const;
  if (type.startsWith('video/')) return 'video' as const;
  if (type.startsWith('audio/')) return 'audio' as const;
  return null;
}

function safeExtension(name: string, mimeType: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]{1,8}$/);
  if (match) return match[0];
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('jpeg')) return '.jpg';
  return '';
}
