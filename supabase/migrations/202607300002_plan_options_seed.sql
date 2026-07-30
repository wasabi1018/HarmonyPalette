insert into public.plan_facilities (name, display_order, is_active)
values
  ('ハーモニービレッジ', 10, true),
  ('ハーモニーパーク', 20, true),
  ('ホワイトバーズスクエア', 30, true),
  ('フェスティバルステージ', 40, true),
  ('プラザステージ', 50, true),
  ('イベントホール', 60, true),
  ('ハーモニーガーデン', 70, true),
  ('カーニバルスクエア', 80, true),
  ('ネイチャーエリア', 90, true),
  ('フレンドリーホール', 100, true),
  ('ハーベストテーブル', 200, true),
  ('POMPOMPURIN DINER', 210, true),
  ('MY MELODY & KUROMI Cafe Terrace', 220, true),
  ('キャラフルマルシェ', 230, true),
  ('カントリーマーケット', 300, true),
  ('サンリオキャラクターコレクション', 310, true),
  ('サンリオnakayokuショップ', 320, true),
  ('リトルギフト', 330, true),
  ('メルヘン工房', 340, true),
  ('ゲストインフォメーション', 400, true),
  ('ベビーセンター', 410, true)
on conflict do nothing;

insert into public.plan_attractions (name, display_order, is_active)
values
  ('キティキャッスル', 10, true),
  ('リズミックコースター', 20, true),
  ('ハーモニートレイン', 30, true),
  ('キャラクターグリーティングファンスタジオ', 40, true),
  ('Sky Pal Collection ~UNI-ONE × AR~', 50, true),
  ('サンリオEVゴーカート', 60, true),
  ('大観覧車ワンダーパノラマ', 70, true),
  ('ハローキティのエンジェルコースター', 80, true),
  ('スカイジェット', 90, true),
  ('ウォーターショット', 100, true),
  ('ストロベリーカフェ', 110, true),
  ('フェアリーキティカルーセル', 120, true),
  ('ポップンスマイル', 130, true),
  ('サンリオキャラクターボートライド', 140, true)
on conflict do nothing;

update public.plan_attractions attraction
set facility_id = facility.id
from public.plan_facilities facility
where
  (attraction.name = 'キャラクターグリーティングファンスタジオ' and facility.name = 'ハーモニーパーク')
  or (attraction.name = 'スカイジェット' and facility.name = 'ホワイトバーズスクエア')
  or (attraction.name = 'サンリオキャラクターボートライド' and facility.name = 'カーニバルスクエア');
