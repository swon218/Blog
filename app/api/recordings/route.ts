import { NextResponse } from 'next/server';
import { getRecordings } from '@/lib/blog-data';
import { OwnerAccessError, requireApiOwner } from '@/lib/owner-auth';

export async function GET(request: Request) {
  try {
    await requireApiOwner();
    const postId = new URL(request.url).searchParams.get('post') ?? undefined;
    return NextResponse.json({ recordings: await getRecordings(postId) });
  } catch (error) {
    if (error instanceof OwnerAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: '녹음 목록을 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
