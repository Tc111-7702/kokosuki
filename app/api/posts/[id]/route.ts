import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/posts/[id] — 単体投稿（カード表示用・閲覧者のいいね状態付き）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const row = await db.getPostById(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const session = await auth.api.getSession({ headers: await headers() });
    const viewerId = session?.user?.id ?? null;
    let likedByMe = false;
    if (viewerId) {
      const liked = await db.getPostLikedIds(viewerId, [id]);
      likedByMe = liked.length > 0;
    }
    return NextResponse.json({ post: { ...row, postType: 'post' as const, likedByMe } });
  } catch (e) {
    console.error('[posts GET]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/posts/[id] — 自分の投稿を削除（onDelete Cascade で likes/replies も連鎖削除）
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await db.getPostOwnerId(id);

    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[posts DELETE]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
