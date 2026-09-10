-- 通報（Report）テーブル追加
-- targetType + targetId で投稿・返信・口コミ・アカウント等をポリモーフィック参照（FK は User のみ）

CREATE TABLE "Report" (
    "id"             TEXT NOT NULL,
    "reporterId"     TEXT NOT NULL,
    "targetType"     TEXT NOT NULL,
    "targetId"       TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reasonKeys"     TEXT[] NOT NULL,
    "detail"         TEXT,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key"
    ON "Report"("reporterId", "targetType", "targetId");
CREATE INDEX "Report_targetType_targetId_idx"
    ON "Report"("targetType", "targetId");
CREATE INDEX "Report_reportedUserId_status_idx"
    ON "Report"("reportedUserId", "status");
CREATE INDEX "Report_status_createdAt_idx"
    ON "Report"("status", "createdAt");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey"
    FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
