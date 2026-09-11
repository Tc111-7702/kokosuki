-- お知らせに既読ユーザーID配列を追加

ALTER TABLE "Announcement" ADD COLUMN "readByUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
