import { NextResponse } from 'next/server';
import {
  createSubject,
  deletePost,
  deleteSubject,
  getAdminSnapshot,
  renameSubject,
  reorderPosts,
  reorderSubjects,
  savePost,
  setPostVisibility,
  setSubjectVisibility,
  updateSubject,
  type BlogNode,
  type PostStatus,
  type SubjectVisibility,
} from '@/lib/blog-data';
import { OwnerAccessError, requireApiOwner } from '@/lib/owner-auth';

type AdminRequest = {
  action:
    | 'createSubject'
    | 'renameSubject'
    | 'updateSubject'
    | 'setSubjectVisibility'
    | 'deleteSubject'
    | 'reorderSubjects'
    | 'savePost'
    | 'deletePost'
    | 'setPostVisibility'
    | 'reorderPosts';
  id?: string;
  ids?: string[];
  name?: string;
  description?: string;
  subjectId?: string;
  title?: string;
  excerpt?: string;
  status?: PostStatus;
  visibility?: SubjectVisibility;
  content?: BlogNode;
};

export async function GET() {
  try {
    await requireApiOwner();
    return NextResponse.json(await getAdminSnapshot());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiOwner();
    const body = (await request.json()) as AdminRequest;
    let savedId: string | undefined;

    switch (body.action) {
      case 'createSubject':
        await createSubject(body.name ?? '');
        break;
      case 'renameSubject':
        requireValue(body.id, '과목 ID');
        await renameSubject(body.id!, body.name ?? '');
        break;
      case 'updateSubject':
        requireValue(body.id, '과목 ID');
        await updateSubject(body.id!, body.name ?? '', body.description ?? '');
        break;
      case 'setSubjectVisibility':
        requireValue(body.id, '과목 ID');
        await setSubjectVisibility(body.id!, body.visibility ?? 'private');
        break;
      case 'deleteSubject':
        requireValue(body.id, '과목 ID');
        await deleteSubject(body.id!);
        break;
      case 'reorderSubjects':
        await reorderSubjects(body.ids ?? []);
        break;
      case 'savePost':
        requireValue(body.subjectId, '과목');
        savedId = await savePost({
          id: body.id,
          subjectId: body.subjectId!,
          title: body.title ?? '',
          excerpt: body.excerpt ?? '',
          status: body.status ?? 'draft',
          content: body.content ?? {
            type: 'doc',
            content: [{ type: 'paragraph' }],
          },
        });
        break;
      case 'deletePost':
        requireValue(body.id, '게시글 ID');
        await deletePost(body.id!);
        break;
      case 'setPostVisibility':
        requireValue(body.id, '게시글 ID');
        await setPostVisibility(body.id!, body.visibility ?? 'private');
        break;
      case 'reorderPosts':
        requireValue(body.subjectId, '과목');
        await reorderPosts(body.subjectId!, body.ids ?? []);
        break;
      default:
        return NextResponse.json(
          { error: '지원하지 않는 작업입니다.' },
          { status: 400 },
        );
    }

    return NextResponse.json({
      ...(await getAdminSnapshot()),
      savedId,
    });
  } catch (error) {
    return failure(error);
  }
}

function requireValue(value: string | undefined, label: string) {
  if (!value) throw new Error(label + ' 값이 없습니다.');
}

function failure(error: unknown) {
  if (error instanceof OwnerAccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  const message =
    error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
  return NextResponse.json({ error: message }, { status: 400 });
}
