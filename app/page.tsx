import { chatGPTSignInPath, chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { HomeCatalog } from '@/components/home-catalog';
import { getPublicCatalog } from '@/lib/blog-data';
import { getOptionalOwner } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; q?: string }>;
}) {
  const query = await searchParams;
  const owner = await getOptionalOwner();
  const catalog = await getPublicCatalog(query.subject, Boolean(owner));

  return (
    <HomeCatalog
      subjects={catalog.subjects}
      posts={catalog.navigationPosts}
      initialSubjectId={catalog.selected?.id}
      isOwner={Boolean(owner)}
      ownerSignInPath={chatGPTSignInPath('/admin')}
      ownerSignOutPath={owner ? chatGPTSignOutPath('/') : undefined}
      search={query.q}
    />
  );
}
