import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';

// 掲載枠の管理 API（管理者専用・セクション汎用）。
//   section: 'weekly'（今週発売） | 'reissue'（再販・また引ける！）
//   GET    候補（IPグループ）＋選択中を返す。reissue は初回いいね上位10件を自動選択。
//   POST   { gachaId } を選択に追加（最大 MAX 件）
//   DELETE { gachaId } を選択から削除

export const dynamic = 'force-dynamic';

const SECTIONS = ['weekly', 'reissue'] as const;
type Section = (typeof SECTIONS)[number];
const MAX = 10;

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// 今日から見た「次の月曜」で月が替わるなら今月＋来月、そうでなければ今月のみ（今週発売用）
function candidateRange(now: Date): { start: Date; end: Date } {
  const day = now.getDay();
  const diffToMonday = ((8 - day) % 7) || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + diffToMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const monthChanges =
    nextMonday.getMonth() !== now.getMonth() || nextMonday.getFullYear() !== now.getFullYear();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = monthChanges
    ? new Date(now.getFullYear(), now.getMonth() + 2, 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

type CardRow = Awaited<ReturnType<typeof db.findWeeklyReleaseCandidates>>[number];
const toItem = (g: CardRow) => ({
  id: g.id,
  seriesName: g.seriesName,
  ipName: g.ipName,
  imageUrl: g.imageUrl,
  gradientFrom: g.gradientFrom,
  gradientTo: g.gradientTo,
  likeCount: g._count.gachaLikes,
  status: g.status,
  releaseDate: g.releaseDate,
});

function parseSection(raw: string): Section | null {
  return (SECTIONS as readonly string[]).includes(raw) ? (raw as Section) : null;
}

async function getCandidates(section: Section): Promise<CardRow[]> {
  if (section === 'weekly') {
    const { start, end } = candidateRange(new Date());
    return db.findWeeklyReleaseCandidates(start, end);
  }
  // reissue: すでに店舗にある「（再販）」表記のガチャ
  return db.findReissueCandidates();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ section: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const section = parseSection((await params).section);
  if (!section) return NextResponse.json({ error: 'unknown section' }, { status: 404 });

  const candidates = await getCandidates(section);
  let selectedRows = await db.getHomeFeaturedGachas(section);

  // 再販はデフォルトでいいね数上位10件を自動選択（未設定＝初回のみ）
  if (section === 'reissue' && selectedRows.length === 0) {
    const top = await db.findReissueTop(MAX);
    for (const g of top) await db.addHomeFeatured(section, g.id);
    selectedRows = await db.getHomeFeaturedGachas(section);
  }

  // ipName でグルーピング（候補は ipName 昇順なので順序を維持）
  const groupsMap = new Map<string, ReturnType<typeof toItem>[]>();
  for (const g of candidates) {
    if (!groupsMap.has(g.ipName)) groupsMap.set(g.ipName, []);
    groupsMap.get(g.ipName)!.push(toItem(g));
  }
  const groups = [...groupsMap.entries()].map(([ipName, items]) => ({ ipName, items }));

  return NextResponse.json({ groups, selected: selectedRows.map(toItem), max: MAX });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ section: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const section = parseSection((await params).section);
  if (!section) return NextResponse.json({ error: 'unknown section' }, { status: 404 });

  const { gachaId } = (await req.json().catch(() => ({}))) as { gachaId?: string };
  if (!gachaId) return NextResponse.json({ error: 'gachaId required' }, { status: 400 });

  const existing = await db.getHomeFeaturedGachas(section);
  const already = existing.some((g) => g.id === gachaId);
  if (!already && existing.length >= MAX) {
    return NextResponse.json({ error: `最大${MAX}個までです`, code: 'MAX' }, { status: 409 });
  }

  await db.addHomeFeatured(section, gachaId);
  const selected = (await db.getHomeFeaturedGachas(section)).map(toItem);
  return NextResponse.json({ selected });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ section: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const section = parseSection((await params).section);
  if (!section) return NextResponse.json({ error: 'unknown section' }, { status: 404 });

  const { gachaId } = (await req.json().catch(() => ({}))) as { gachaId?: string };
  if (!gachaId) return NextResponse.json({ error: 'gachaId required' }, { status: 400 });

  await db.removeHomeFeatured(section, gachaId);
  const selected = (await db.getHomeFeaturedGachas(section)).map(toItem);
  return NextResponse.json({ selected });
}
