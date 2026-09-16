'use client';

import { useState, useRef, useCallback, useMemo } from 'react';

// メンション候補になり得るユーザー（投稿主・返信者）。handle は @メンションの挿入・一致に使う。
export interface MentionUser {
  id: string;
  name: string;
  image: string | null;
  profile?: { handle: string | null } | null;
}

/**
 * 返信入力のメンション機能（@補完）を提供する共通フック。
 * PostDetail / StockPostDetail / InlineReplies で共有する。
 *  - 候補は participants（投稿主＋返信者）から、名前 or handle 部分一致で絞り込む（自分は除外）。
 *  - 挿入・表示は @handle 形式（handle が無ければ名前でフォールバック）。
 *
 * @param participants 候補にし得るユーザー配列（先頭を優先表示。重複は自動除去）
 * @param currentUid   自分のユーザーID（自己メンションを除外）
 */
export function useMentionInput(participants: MentionUser[], currentUid?: string | null) {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [insertedMentions, setInsertedMentions] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null);

  // 候補: 名前 or handle が query を含むユーザー（順序維持・重複/自分除外）。
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const seen = new Set<string>();
    const result: MentionUser[] = [];
    for (const u of participants) {
      if (!u || u.id === currentUid || seen.has(u.id)) continue;
      seen.add(u.id);
      if (q === '' || u.name.toLowerCase().includes(q) || (u.profile?.handle?.toLowerCase().includes(q) ?? false)) {
        result.push(u);
      }
    }
    return result;
  }, [participants, mentionQuery, currentUid]);

  const closeMention = useCallback(() => {
    mentionStartRef.current = null;
    setMentionQuery(null);
  }, []);

  // @ の開始検知・追従・終了と、@〜カーソル間の検索語(mentionQuery)の更新。
  const updateMentionState = useCallback((val: string, cursor: number) => {
    const ms = mentionStartRef.current;
    if (ms !== null) {
      if (val[ms] !== '@' || cursor <= ms) {
        mentionStartRef.current = null;
        setMentionQuery(null);
      } else {
        setMentionQuery(val.slice(ms + 1, cursor));
      }
    } else if (cursor > 0 && val[cursor - 1] === '@') {
      const prev = cursor >= 2 ? val[cursor - 2] : ' ';
      if (prev === ' ' || prev === '\n' || cursor === 1) {
        mentionStartRef.current = cursor - 1;
        setMentionQuery('');
      }
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setText(val);
    updateMentionState(val, cursor);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    updateMentionState(el.value, el.selectionStart ?? 0);
  };

  // 候補選択時: @〜カーソル間の打ちかけを「@token 」に置換し、カーソルを直後へ。
  const insertMention = (token: string) => {
    const el = textareaRef.current;
    const ms = mentionStartRef.current;
    if (!el || ms === null) return;
    const cursor = el.selectionStart ?? text.length;
    const newText = text.slice(0, ms) + '@' + token + ' ' + text.slice(cursor);
    setText(newText);
    setInsertedMentions((prev) => (prev.includes('@' + token) ? prev : [...prev, '@' + token]));
    mentionStartRef.current = null;
    setMentionQuery(null);
    setTimeout(() => {
      el.focus();
      const pos = ms + token.length + 2;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  // 入力プレビュー用: 確定済みメンション(@token)だけ青字にして返す。
  const renderMentionText = useCallback(
    (t: string): React.ReactNode => {
      if (insertedMentions.length === 0) return t;
      const escaped = [...insertedMentions]
        .sort((a, b) => b.length - a.length)
        .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp('(' + escaped.join('|') + ')', 'g');
      return t.split(regex).map((part, i) =>
        insertedMentions.includes(part)
          ? <span key={i} className="text-[#3d9bff] dark:text-[#66b2ff] font-medium">{part}</span>
          : <span key={i}>{part}</span>,
      );
    },
    [insertedMentions],
  );

  // 送信後などに入力状態をクリア。
  const reset = () => {
    setText('');
    setInsertedMentions([]);
    mentionStartRef.current = null;
    setMentionQuery(null);
  };

  return {
    text,
    setText,
    mentionQuery,
    mentionCandidates,
    textareaRef,
    handleTextChange,
    handleSelect,
    insertMention,
    renderMentionText,
    closeMention,
    reset,
  };
}
