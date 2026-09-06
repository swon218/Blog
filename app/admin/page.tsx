import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { redirect } from 'next/navigation';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { AdminWorkspace } from '@/components/admin-workspace';
import { getAdminSnapshot } from '@/lib/blog-data';
import { isOwner } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; post?: string; new?: string }>;
}) {
  const query = await searchParams;
  const user = await requireChatGPTUser('/admin');
  if (!isOwner(user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <span className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
            <ShieldX className="size-5" />
          </span>
          <h1 className="text-xl font-bold">관리자 계정이 아닙니다.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            현재 로그인한 계정은 {user.email}입니다. 배포 설정에 등록된 블로그
            소유자만 이 화면에 접근할 수 있습니다.
          </p>
          <Link
            href={chatGPTSignOutPath('/')}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            로그아웃
          </Link>
        </div>
      </main>
    );
  }

  if (query.new !== '1' && !query.post) redirect('/');

  const snapshot = await getAdminSnapshot();
  return (
    <AdminWorkspace
      initialSnapshot={snapshot}
      ownerName={user.fullName ?? user.email}
      signOutPath={chatGPTSignOutPath('/')}
      initialSubjectId={query.subject}
      initialPostId={query.post}
      startWithNewPost={query.new === '1'}
    />
  );
}
