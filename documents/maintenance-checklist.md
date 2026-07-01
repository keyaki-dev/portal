---
title: プロダクト情報 メンテナンスチェックリスト
---

# プロダクト情報 メンテナンスチェックリスト

orchestrator および engineer が参照する、プロダクト情報変更時の更新箇所リスト。

---

## プロダクト URL が変わった時

- [ ] `portal/app/products/page.tsx` — リンク URL を更新
- [ ] `portal/documents/仕様書/keyaki-org-chart.html` — 該当プロダクト URL（記載あれば）
- [ ] `portfolio/app/(portfolio)/portfolio/page.tsx` — 掲載プロダクトの URL（掲載している場合）
- [ ] `portfolio/app/(lp)/focus/page.tsx` — kodou flow LP 内リンク（kodou flow のみ）
- [ ] `portfolio/next.config.ts` — subdomain rewrite ルール（サブドメインが変わった場合）

## プロダクト名が変わった時

- [ ] `portal/app/products/page.tsx` — name フィールド
- [ ] `portal/documents/仕様書/keyaki-org-chart.html` — PM 名・ロール名
- [ ] `portal/documents/組織/ai-org-manual.html` — PM 名・tmux コマンド名
- [ ] `portal/documents/組織/組織発展計画.md` — 組織構成図
- [ ] `~/agent/_shared/COMPANY.md` — メンバー名簿の PM 行
- [ ] `~/agent/orchestrator/AGENTS.md` — 管轄プロダクト一覧
- [ ] `~/agent/engineer/DOCS.md` — 管理対象プロジェクト表

## 新プロダクトを追加した時

- [ ] `portal/app/products/page.tsx` — products 配列に追加
- [ ] `portal/documents/仕様書/keyaki-org-chart.html` — PM ノードを追加
- [ ] `portal/documents/組織/ai-org-manual.html` — PM セクションを追加
- [ ] `~/agent/_shared/COMPANY.md` — メンバー名簿に PM を追記
- [ ] `~/agent/engineer/DOCS.md` — 管理対象プロジェクト表に追記

## スクリーンショットを更新した時

- [ ] `portal/documents/edanet/screenshots/` — edanet スクリーンショット
- [ ] Playwright スクリプトで撮影（`~/keyaki/portal/publisher/` 参照）

## 定期確認項目（月1回推奨）

- [ ] 各プロダクトの本番 URL が HTTP 200 を返すか curl で確認
- [ ] Vercel デプロイが正常に動いているか確認（`vercel ls`）
- [ ] portal/documents/ に古い名称（移行前の旧名）が残っていないか `grep` で確認

---

最終更新: 2026-07-01 by engineer
