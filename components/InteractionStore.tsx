'use client';

import {
  createContext, useContext, useReducer, useCallback, useRef, useEffect, useState, useMemo,
  type ReactNode,
} from 'react';

// いいね／返信状態の一元管理ストア。
// 同じ投稿を「一覧カード」と「詳細ビュー」の別インスタンスが表示しても、
// このストア経由なら 1 つのエントリを共有するため、いいね・返信数がズレない。
// Provider が無い画面（ガチャ/店舗/マイページ等）では各カードがローカルstateに
// フォールバックして従来どおり動く（dual-mode）。

export type InteractionKind = 'post' | 'stock';
export interface Interaction { likedByMe: boolean; likeCount: number; replyCount: number; }

const keyOf   = (kind: InteractionKind, id: string) => `${kind}:${id}`;
const likeUrl = (kind: InteractionKind, id: string) =>
  kind === 'stock' ? `/api/stock-posts/${id}/like` : `/api/posts/${id}/like`;

type State = Record<string, Interaction>;
type Action =
  | { type: 'seed'; key: string; value: Interaction }
  | { type: 'set'; key: string; value: Partial<Interaction> }
  | { type: 'toggleOptimistic'; key: string }
  | { type: 'bumpReply'; key: string; delta: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'seed':
      // 既存エントリは上書きしない（進行中の楽観値やサーバ確定値を保持）
      if (action.key in state) return state;
      return { ...state, [action.key]: action.value };
    case 'set': {
      const cur = state[action.key];
      if (!cur) return state;
      return { ...state, [action.key]: { ...cur, ...action.value } };
    }
    case 'toggleOptimistic': {
      const cur = state[action.key];
      if (!cur) return state;
      const liked = !cur.likedByMe;
      return { ...state, [action.key]: { ...cur, likedByMe: liked, likeCount: cur.likeCount + (liked ? 1 : -1) } };
    }
    case 'bumpReply': {
      const cur = state[action.key];
      if (!cur) return state;
      return { ...state, [action.key]: { ...cur, replyCount: Math.max(0, cur.replyCount + action.delta) } };
    }
    default:
      return state;
  }
}

interface Store {
  state: State;
  seed: (kind: InteractionKind, id: string, value: Interaction) => void;
  toggleLike: (kind: InteractionKind, id: string) => void;
  bumpReply: (kind: InteractionKind, id: string, delta: number) => void;
}

const InteractionContext = createContext<Store | null>(null);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const pendingRef = useRef<Set<string>>(new Set()); // いいね二重送信ガード

  const seed = useCallback((kind: InteractionKind, id: string, value: Interaction) => {
    dispatch({ type: 'seed', key: keyOf(kind, id), value });
  }, []);

  const bumpReply = useCallback((kind: InteractionKind, id: string, delta: number) => {
    dispatch({ type: 'bumpReply', key: keyOf(kind, id), delta });
  }, []);

  // 楽観更新 → サーバ確定(reconcile) → 失敗ロールバック を 1 箇所に集約
  const toggleLike = useCallback((kind: InteractionKind, id: string) => {
    const k = keyOf(kind, id);
    if (pendingRef.current.has(k)) return;
    pendingRef.current.add(k);
    dispatch({ type: 'toggleOptimistic', key: k });
    fetch(likeUrl(kind, id), { method: 'POST' })
      .then(async (res) => {
        if (res.ok) {
          const d: { liked: boolean; likeCount: number } = await res.json();
          dispatch({ type: 'set', key: k, value: { likedByMe: d.liked, likeCount: d.likeCount } });
        } else {
          dispatch({ type: 'toggleOptimistic', key: k }); // ロールバック
        }
      })
      .catch(() => dispatch({ type: 'toggleOptimistic', key: k })) // ロールバック
      .finally(() => { pendingRef.current.delete(k); });
  }, []);

  const store = useMemo<Store>(() => ({ state, seed, toggleLike, bumpReply }), [state, seed, toggleLike, bumpReply]);
  return <InteractionContext.Provider value={store}>{children}</InteractionContext.Provider>;
}

/**
 * カード用フック。Provider があれば共有ストアのエントリを購読、無ければローカルstateで従来動作。
 * 返り値の toggleLike はどちらのモードでも楽観更新＋サーバ確定＋ロールバックを行う。
 */
export function useInteraction(kind: InteractionKind, id: string, initial: Interaction) {
  const store = useContext(InteractionContext);
  const [local, setLocal] = useState<Interaction>(initial);
  const localPendingRef = useRef(false);
  const hasStore = !!store;

  // Provider がある場合は自分のエントリを一度だけ seed（既存なら no-op）
  useEffect(() => {
    if (store) store.seed(kind, id, initial);
    // initial は id 単位で固定とみなし、再seed しない（依存は provider有無/種別/id のみ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStore, kind, id]);

  if (store) {
    const entry = store.state[keyOf(kind, id)] ?? initial;
    return {
      liked: entry.likedByMe,
      likeCount: entry.likeCount,
      replyCount: entry.replyCount,
      toggleLike: () => store.toggleLike(kind, id),
    };
  }

  // ── Provider 無し: ローカル楽観更新（従来挙動） ──
  const toggleLike = () => {
    if (localPendingRef.current) return;
    localPendingRef.current = true;
    const nextLiked = !local.likedByMe;
    setLocal((s) => ({ ...s, likedByMe: nextLiked, likeCount: s.likeCount + (nextLiked ? 1 : -1) }));
    fetch(likeUrl(kind, id), { method: 'POST' })
      .then(async (res) => {
        if (res.ok) {
          const d: { liked: boolean; likeCount: number } = await res.json();
          setLocal((s) => ({ ...s, likedByMe: d.liked, likeCount: d.likeCount }));
        } else {
          setLocal((s) => ({ ...s, likedByMe: !nextLiked, likeCount: s.likeCount + (nextLiked ? -1 : 1) }));
        }
      })
      .catch(() => setLocal((s) => ({ ...s, likedByMe: !nextLiked, likeCount: s.likeCount + (nextLiked ? -1 : 1) })))
      .finally(() => { localPendingRef.current = false; });
  };
  // 返信数は Provider 無しの画面では prop 由来（親が post._count.replies を更新する）を尊重する。
  return { liked: local.likedByMe, likeCount: local.likeCount, replyCount: initial.replyCount, toggleLike };
}

/** 詳細ビュー用。返信の送信/削除で返信数を増減する（Provider が無ければ no-op）。 */
export function useInteractionActions() {
  const store = useContext(InteractionContext);
  return {
    bumpReply: (kind: InteractionKind, id: string, delta: number) => store?.bumpReply(kind, id, delta),
  };
}
