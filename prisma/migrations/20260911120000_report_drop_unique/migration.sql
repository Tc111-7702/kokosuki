-- 通報: 同一ユーザー×同一対象の unique 制約を撤去（都度新規作成を許可）

DROP INDEX "Report_reporterId_targetType_targetId_key";

CREATE INDEX "Report_reporterId_targetType_targetId_idx"
    ON "Report"("reporterId", "targetType", "targetId");
