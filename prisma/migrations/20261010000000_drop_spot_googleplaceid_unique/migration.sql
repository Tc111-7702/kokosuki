-- 同一建物内に同居する店舗（モール等）は Google 上で同じ place_id に解決されるため、
-- googlePlaceId の一意制約を外して複数スポットが同じ place_id を共有できるようにする。
-- これにより place-id-fetch の Unique constraint 違反（P2002）が解消される。
-- ※ 本プロジェクトのデプロイは migrate を自動実行しないため手動適用する運用。
--    手動で先に落とした場合でも安全なよう IF EXISTS を付与（migrate deploy とも整合）。
DROP INDEX IF EXISTS "Spot_googlePlaceId_key";
