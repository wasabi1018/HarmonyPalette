"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ExternalLink,
  Hotel as HotelIcon,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  BOOKING_PROVIDERS,
  driveLabel,
  emptyHotel,
  hotelImageUrl,
  prState,
  type Hotel,
  type HotelCatalog,
  type HotelMaster,
} from "@/lib/hotels/model";
import type { HotelMetric } from "@/lib/hotels/repository";
import { HotelCatalogView } from "@/components/hotels/hotel-catalog";
import css from "./hotel-manager.module.css";

const statusName = { draft: "下書き", published: "公開", archived: "非公開" };
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  hint = "",
  disabled = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={css.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          maxLength={4000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={type === "url" ? 4000 : 500}
        />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={css.check}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function jstInput(value: string | null) {
  return value
    ? new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 16)
    : "";
}
function jstValue(value: string) {
  return value ? new Date(`${value}:00+09:00`).toISOString() : null;
}
function move<T>(values: T[], index: number, delta: number) {
  const next = [...values];
  const target = index + delta;
  if (target >= 0 && target < next.length)
    [next[index], next[target]] = [next[target], next[index]];
  return next;
}
function OrderButtons({
  index,
  length,
  onMove,
}: {
  index: number;
  length: number;
  onMove: (delta: number) => void;
}) {
  return (
    <span className={css.order}>
      <button
        type="button"
        aria-label="上へ移動"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        aria-label="下へ移動"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} />
      </button>
    </span>
  );
}
type Action = Record<string, unknown>;
export function HotelManager({
  initialCatalog,
  initialMetrics = [],
  setupError = "",
}: {
  initialCatalog: HotelCatalog;
  initialMetrics?: HotelMetric[];
  setupError?: string;
}) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [tab, setTab] = useState("hotels");
  const [editTab, setEditTab] = useState("basic");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState(setupError);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function action(body: Action) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/hotels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      setCatalog(data.catalog);
      setMetrics(data.metrics);
      setMessage("保存しました。");
      return data.catalog as HotelCatalog;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存できませんでした。",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  function update(patch: Partial<Hotel>) {
    setHotel((h) => (h ? { ...h, ...patch } : h));
    setDirty(true);
  }
  function leave() {
    if (dirty && !window.confirm("未保存の変更があります。一覧へ戻りますか？"))
      return;
    setHotel(null);
    setDirty(false);
    setMessage("");
  }
  async function save() {
    if (!hotel) return;
    const updated = await action({ action: "save", hotel });
    if (updated) {
      setHotel(updated.hotels.find((h) => h.id === hotel.id) ?? null);
      setDirty(false);
    }
  }
  async function upload(file: File) {
    if (!hotel || hotel.images.length >= 12) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/hotels/images", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      update({
        images: [
          ...hotel.images,
          {
            id: crypto.randomUUID(),
            path: data.path,
            url: "",
            kind: "upload",
            alt: `${hotel.name}の写真`,
            credit: "",
            license: "",
            expiresOn: null,
            bookingLinkId: "",
          },
        ],
      });
      setMessage(
        "写真を追加しました。提供元・利用許諾を入力してホテル情報を保存してください。",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "写真を保存できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }
  const emptyState = !catalog.available;
  const activeHotels = catalog.hotels.filter((h) =>
    status === "trash"
      ? h.deletedAt
      : !h.deletedAt && (status === "all" || h.status === status),
  );
  return (
    <div className={css.manager}>
      <div className={css.heading}>
        <div>
          <p className={css.eyebrow}>STAY & HARMONYLAND</p>
          <h1>
            <HotelIcon size={25} aria-hidden="true" />
            周辺ホテル管理
          </h1>
          <p className={css.sub}>
            ホテル情報・予約リンク・おすすめ・PR掲載をまとめて管理します。
          </p>
        </div>
        <Link href="/hotels" target="_blank" className={css.secondary}>
          公開ページ
          <ExternalLink size={13} />
        </Link>
      </div>
      {message && (
        <p role="status" aria-live="polite" className={css.message}>
          {message}
        </p>
      )}
      {!hotel ? (
        <>
          <div
            className={css.tabs}
            role="group"
            aria-label="ホテル管理の表示切り替え"
          >
            {[
              ["hotels", "ホテル一覧"],
              ["masters", "エリア・特徴タグ"],
              ["analytics", "アクセス・クリック"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "hotels" && (
            <>
              <div className={css.tools}>
                <label className={css.select}>
                  <span className="sr-only">ホテルの公開状態で絞り込む</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {[
                      ["all", "すべてのホテル"],
                      ["draft", "下書き"],
                      ["published", "公開"],
                      ["archived", "非公開"],
                      ["trash", "ゴミ箱"],
                    ].map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={css.count}>{activeHotels.length}施設</span>
                <button
                  disabled={busy || emptyState}
                  className={css.secondary}
                  onClick={() => {
                    if (
                      window.confirm(
                        "未登録の初期6施設を下書きとして登録します。既存データは上書きしません。",
                      )
                    )
                      void action({ action: "starters" });
                  }}
                >
                  初期6施設を下書き登録
                </button>
                <button
                  disabled={emptyState}
                  className={css.primary}
                  onClick={() => {
                    setHotel(emptyHotel(crypto.randomUUID()));
                    setEditTab("basic");
                    setMessage("");
                  }}
                >
                  <Plus size={16} />
                  ホテルを登録
                </button>
              </div>
              <div className={css.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>ホテル</th>
                      <th>公開状態</th>
                      <th>所要時間</th>
                      <th>掲載順</th>
                      <th>おすすめ / PR</th>
                      <th>予約リンク</th>
                      <th>最終確認</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHotels.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <strong>{h.name}</strong>
                          <small>
                            {catalog.areas.find((a) => a.id === h.areaId)?.name}{" "}
                            · /{h.slug}
                          </small>
                        </td>
                        <td>
                          <span
                            className={
                              h.status === "published" && !h.deletedAt
                                ? css.published
                                : css.badge
                            }
                          >
                            {h.deletedAt ? "削除済み" : statusName[h.status]}
                          </span>
                        </td>
                        <td>{driveLabel(h)}</td>
                        <td>{h.sortOrder}</td>
                        <td>
                          {h.recommended ? "おすすめ" : "—"}
                          <small>PR：{prState(h, Date.now())}</small>
                        </td>
                        <td>
                          {h.bookingLinks.length
                            ? `${h.bookingLinks.length}サービス`
                            : "未登録"}
                        </td>
                        <td>{h.verifiedOn || "未確認"}</td>
                        <td>
                          {h.deletedAt ? (
                            <button
                              disabled={busy}
                              className={css.textButton}
                              onClick={() =>
                                void action({
                                  action: "restore",
                                  id: h.id,
                                  updatedAt: h.updatedAt,
                                })
                              }
                            >
                              下書きへ復元
                            </button>
                          ) : (
                            <>
                              <button
                                className={css.textButton}
                                onClick={() => {
                                  setHotel(structuredClone(h));
                                  setEditTab("basic");
                                  setMessage("");
                                }}
                              >
                                編集
                              </button>
                              <button
                                aria-label={`${h.name}を削除`}
                                className={css.iconButton}
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `${h.name}をゴミ箱へ移動しますか？公開ページとPR掲載から非表示になります。`,
                                    )
                                  )
                                    void action({
                                      action: "delete",
                                      id: h.id,
                                      updatedAt: h.updatedAt,
                                    });
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!activeHotels.length && (
                  <div className={css.empty}>
                    {emptyState
                      ? "ホテルDBの準備が必要です。セットアップ手順に従ってマイグレーションを適用してください。"
                      : "ホテルはまだありません。「初期6施設を下書き登録」から始められます。"}
                  </div>
                )}
              </div>
              <p className={css.note}>
                削除したホテルはゴミ箱から下書きへ復元できます。施設IDと記事との関連は維持されます。
              </p>
            </>
          )}
          {tab === "masters" && (
            <div className={css.masterGrid}>
              {(["areas", "tags"] as const).map((kind) => (
                <MasterEditor
                  key={kind}
                  title={kind === "areas" ? "エリア" : "特徴タグ"}
                  items={catalog[kind]}
                  disabled={busy || emptyState}
                  onSave={(item) => action({ action: "master", kind, item })}
                />
              ))}
            </div>
          )}
          {tab === "analytics" && (
            <HotelAnalytics metrics={metrics} hotels={catalog.hotels} />
          )}
        </>
      ) : (
        <>
          <div className={css.editBar}>
            <button className={css.textButton} onClick={leave}>
              <ArrowLeft size={15} />
              ホテル一覧へ
            </button>
            <strong>{hotel.name || "新しいホテル"}</strong>
            <span className={css.badge}>
              {dirty ? "未保存の変更あり" : statusName[hotel.status]}
            </span>
            <button
              className={css.primary}
              disabled={busy}
              onClick={() => void save()}
            >
              <Save size={15} />
              {busy ? "保存中…" : "保存する"}
            </button>
          </div>
          <div className={css.tabs} role="group" aria-label="ホテルの編集項目">
            {[
              ["basic", "基本・アクセス"],
              ["images", "写真"],
              ["booking", "予約リンク"],
              ["publish", "公開・PR"],
              ["preview", "プレビュー"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={editTab === id}
                onClick={() => setEditTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <fieldset className={css.editor} disabled={busy}>
            {editTab === "basic" && (
              <>
                <h2>基本情報</h2>
                <div className={css.twoColumns}>
                  <Field
                    label="ホテル名"
                    value={hotel.name}
                    onChange={(name) => update({ name })}
                  />
                  <Field
                    label="ホテルURL（slug）"
                    value={hotel.slug}
                    onChange={(slug) => update({ slug })}
                    disabled={Boolean(hotel.updatedAt)}
                    hint="半角英数字とハイフン。初回保存後は固定です。"
                  />
                  <label className={css.field}>
                    <span>エリア</span>
                    <select
                      value={hotel.areaId}
                      onChange={(e) => update({ areaId: e.target.value })}
                    >
                      {catalog.areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {!a.active ? "（無効）" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="所在地"
                    value={hotel.address}
                    onChange={(address) => update({ address })}
                  />
                  <Field
                    label="公式サイトURL"
                    value={hotel.officialUrl}
                    type="url"
                    onChange={(officialUrl) => update({ officialUrl })}
                  />
                  <Field
                    label="情報の最終確認日"
                    value={hotel.verifiedOn || ""}
                    type="date"
                    onChange={(verifiedOn) =>
                      update({ verifiedOn: verifiedOn || null })
                    }
                  />
                </div>
                <Field
                  label="短い紹介文"
                  multiline
                  value={hotel.summary}
                  onChange={(summary) => update({ summary })}
                />
                <Field
                  label="Harmony Palette独自のおすすめポイント"
                  multiline
                  value={hotel.highlight}
                  onChange={(highlight) => update({ highlight })}
                />
                <h2>紹介記事</h2>
                <label className={css.field}>
                  <span>「記事を見る」のリンク先</span>
                  <select value={hotel.articleId} onChange={(event) => update({ articleId: event.target.value })}>
                    <option value="">設定しない</option>
                    {hotel.articleId && !(catalog.articles ?? []).some((article) => article.id === hotel.articleId) && (
                      <option value={hotel.articleId}>登録済みの記事が見つかりません（選び直してください）</option>
                    )}
                    {(catalog.articles ?? []).map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.title}（{article.status === "published" ? "公開" : article.status === "scheduled" ? "予約公開" : "下書き"}）
                      </option>
                    ))}
                  </select>
                </label>
                <p className={css.note}>
                  このホテルを紹介する記事を選んでください。記事が公開済みで公開日時を迎えている場合だけ、一覧に「記事を見る」が表示されます。下書き・非公開・削除された記事へのボタンは表示しません。
                </p>
                {hotel.articleId && <Link className={css.textButton} href={`/admin/articles/${hotel.articleId}`} target="_blank" rel="noopener noreferrer">選択した記事を編集する<ExternalLink size={13} aria-hidden="true" /></Link>}
                <h2>ハーモニーランドまでの所要時間</h2>
                <p className={css.note}>
                  未確認の場合は空欄にします。車での目安時間には出典と確認日が必要です。
                </p>
                <div className={css.twoColumns}>
                  <Field
                    label="車での所要時間（分）"
                    type="number"
                    value={hotel.driveMinutes ?? ""}
                    onChange={(v) =>
                      update({ driveMinutes: v === "" ? null : Number(v) })
                    }
                  />
                  <Field
                    label="時間に幅がある場合の上限（分）"
                    type="number"
                    value={hotel.driveMinutesMax ?? ""}
                    onChange={(v) =>
                      update({ driveMinutesMax: v === "" ? null : Number(v) })
                    }
                  />
                  <Field
                    label="所要時間の確認元URL"
                    type="url"
                    value={hotel.driveSourceUrl}
                    onChange={(driveSourceUrl) => update({ driveSourceUrl })}
                  />
                  <Field
                    label="所要時間の確認日"
                    type="date"
                    value={hotel.driveCheckedOn || ""}
                    onChange={(driveCheckedOn) =>
                      update({ driveCheckedOn: driveCheckedOn || null })
                    }
                  />
                </div>
                <Field
                  label="経路・高速道路利用などの補足"
                  multiline
                  value={hotel.driveNote}
                  onChange={(driveNote) => update({ driveNote })}
                />
                <h2>特徴タグ</h2>
                <div className={css.checks}>
                  {catalog.tags
                    .filter((t) => t.id !== "nearby")
                    .map((t) => (
                      <CheckField
                        key={t.id}
                        label={t.name}
                        checked={hotel.tagIds.includes(t.id)}
                        onChange={(v) =>
                          update({
                            tagIds: v
                              ? [...hotel.tagIds, t.id]
                              : hotel.tagIds.filter((id) => id !== t.id),
                          })
                        }
                      />
                    ))}
                </div>
                <p className={css.note}>
                  「近い」は確認済みの所要時間が20分以内の場合に自動判定します。「リーズナブル」は比較条件・根拠を確認して付与してください。
                </p>
              </>
            )}
            {editTab === "booking" && (
              <>
                <h2>宿泊予約サイトへのリンク</h2>
                <p className={css.note}>
                  実際に発行したアフィリエイトURLを登録してください。登録順に表示し、主ボタンは一覧カードで使用します。
                </p>
                {hotel.bookingLinks.map((link, i) => (
                  <div key={link.id} className={css.itemBox}>
                    <div className={css.itemHeading}>
                      <strong>予約サービス {i + 1}</strong>
                      <OrderButtons
                        index={i}
                        length={hotel.bookingLinks.length}
                        onMove={(delta) =>
                          update({
                            bookingLinks: move(hotel.bookingLinks, i, delta),
                          })
                        }
                      />
                      <button
                        type="button"
                        className={css.iconButton}
                        aria-label="予約リンクを外す"
                        onClick={() => {
                          if (
                            hotel.images.some(
                              (p) => p.bookingLinkId === link.id,
                            )
                          ) {
                            setMessage(
                              "このリンクを使う楽天画像を先に外してください。",
                            );
                            return;
                          }
                          update({
                            bookingLinks: hotel.bookingLinks.filter(
                              (b) => b.id !== link.id,
                            ),
                          });
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <label className={css.field}>
                      <span>サービス</span>
                      <select
                        value={link.provider}
                        onChange={(e) => {
                          const provider = e.target.value;
                          update({
                            bookingLinks: hotel.bookingLinks.map((b) =>
                              b.id === link.id
                                ? {
                                    ...b,
                                    provider,
                                    label: BOOKING_PROVIDERS[provider],
                                  }
                                : b,
                            ),
                          });
                        }}
                      >
                        {Object.entries(BOOKING_PROVIDERS).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <Field
                      label="サービス表示名"
                      value={link.label}
                      onChange={(label) =>
                        update({
                          bookingLinks: hotel.bookingLinks.map((b) =>
                            b.id === link.id ? { ...b, label } : b,
                          ),
                        })
                      }
                    />
                    <Field
                      label="アフィリエイトURL"
                      type="url"
                      value={link.url}
                      onChange={(url) =>
                        update({
                          bookingLinks: hotel.bookingLinks.map((b) =>
                            b.id === link.id ? { ...b, url } : b,
                          ),
                        })
                      }
                    />
                    <CheckField
                      label="一覧カードの主ボタンにする"
                      checked={link.primary}
                      onChange={(primary) =>
                        update({
                          bookingLinks: hotel.bookingLinks.map((b) => ({
                            ...b,
                            primary: b.id === link.id ? primary : false,
                          })),
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className={css.secondary}
                  disabled={hotel.bookingLinks.length >= 10}
                  onClick={() =>
                    update({
                      bookingLinks: [
                        ...hotel.bookingLinks,
                        {
                          id: crypto.randomUUID(),
                          provider: "rakuten",
                          label: "楽天トラベル",
                          url: "",
                          primary: !hotel.bookingLinks.length,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  予約サービスを追加
                </button>
              </>
            )}
            {editTab === "images" && (
              <>
                <h2>ホテル写真</h2>
                <p className={css.note}>
                  自身で撮影した写真・掲載許諾のある提供画像を使用してください。楽天の素材は発行済みバナーURLと対応する楽天予約リンクを登録し、写真から楽天へ案内します。
                </p>
                <div className={css.tools}>
                  <label className={css.secondary}>
                    <ImagePlus size={16} />
                    写真をアップロード
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy || hotel.images.length >= 12}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={css.secondary}
                    disabled={hotel.images.length >= 12}
                    onClick={() =>
                      update({
                        images: [
                          ...hotel.images,
                          {
                            id: crypto.randomUUID(),
                            kind: "rakuten",
                            path: "",
                            url: "",
                            alt: `${hotel.name}の楽天トラベル宿泊施設画像`,
                            credit: "楽天トラベル",
                            license:
                              "楽天アフィリエイトの発行済みリンク素材。該当ホテルへの誘導用。",
                            expiresOn: null,
                            bookingLinkId:
                              hotel.bookingLinks.find(
                                (b) => b.provider === "rakuten",
                              )?.id || "",
                          },
                        ],
                      })
                    }
                  >
                    楽天のバナー素材を追加
                  </button>
                </div>
                {hotel.images.map((image, i) => {
                  const patch = (value: Partial<typeof image>) =>
                    update({
                      images: hotel.images.map((p) =>
                        p.id === image.id ? { ...p, ...value } : p,
                      ),
                    });
                  return (
                    <div key={image.id} className={css.itemBox}>
                      <div className={css.itemHeading}>
                        <strong>
                          {i === 0 ? "メイン画像" : `写真 ${i + 1}`}
                        </strong>
                        <OrderButtons
                          index={i}
                          length={hotel.images.length}
                          onMove={(delta) =>
                            update({ images: move(hotel.images, i, delta) })
                          }
                        />
                        <button
                          type="button"
                          className={css.iconButton}
                          aria-label="画像を外す"
                          onClick={() =>
                            update({
                              images: hotel.images.filter(
                                (p) => p.id !== image.id,
                              ),
                            })
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {image.kind === "upload" &&
                        catalog.hotels
                          .find((h) => h.id === hotel.id)
                          ?.images.some((p) => p.id === image.id) && (
                          <>
                            <Image
                              className={css.thumbnail}
                              src={`${hotelImageUrl(hotel.id, image)}?preview=1`}
                              alt={image.alt}
                              width={180}
                              height={100}
                              unoptimized
                            />
                          </>
                        )}
                      {image.kind === "rakuten" && (
                        <>
                          <Field
                            label="発行済みの楽天バナー画像URL"
                            type="url"
                            value={image.url}
                            onChange={(url) => patch({ url })}
                          />
                          <label className={css.field}>
                            <span>画像から誘導する楽天リンク</span>
                            <select
                              value={image.bookingLinkId}
                              onChange={(e) =>
                                patch({ bookingLinkId: e.target.value })
                              }
                            >
                              <option value="">選択してください</option>
                              {hotel.bookingLinks
                                .filter((b) => b.provider === "rakuten")
                                .map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.label}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </>
                      )}
                      <Field
                        label="画像の説明（alt）"
                        value={image.alt}
                        onChange={(alt) => patch({ alt })}
                      />
                      <Field
                        label="写真の提供元・クレジット"
                        value={image.credit}
                        onChange={(credit) => patch({ credit })}
                      />
                      <Field
                        label="利用許諾・取得元の記録"
                        multiline
                        value={image.license}
                        onChange={(license) => patch({ license })}
                      />
                      <Field
                        label="掲載期限（期限なしは空欄）"
                        type="date"
                        value={image.expiresOn || ""}
                        onChange={(expiresOn) =>
                          patch({ expiresOn: expiresOn || null })
                        }
                      />
                    </div>
                  );
                })}
              </>
            )}
            {editTab === "publish" && (
              <>
                <h2>公開・掲載順</h2>
                <div className={css.twoColumns}>
                  <label className={css.field}>
                    <span>公開状態</span>
                    <select
                      value={hotel.status}
                      onChange={(e) =>
                        update({ status: e.target.value as Hotel["status"] })
                      }
                    >
                      {Object.entries(statusName).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="おすすめ順の表示順位（小さい順）"
                    type="number"
                    value={hotel.sortOrder}
                    onChange={(v) => update({ sortOrder: Number(v) })}
                  />
                </div>
                <CheckField
                  label="編集部おすすめに掲載する"
                  checked={hotel.recommended}
                  onChange={(recommended) => update({ recommended })}
                />
                <p className={css.note}>
                  詳しい紹介と検索向けのタイトル・説明文は、紐付けた記事の編集画面で設定してください。ホテル専用の詳細ページは作成しません。
                </p>
                <h2>有料PRの優先掲載</h2>
                <CheckField
                  label="有料PR枠への掲載を有効にする"
                  checked={hotel.prEnabled}
                  onChange={(prEnabled) => update({ prEnabled })}
                />
                <div className={css.twoColumns}>
                  <Field
                    label="PR開始日時（日本時間）"
                    type="datetime-local"
                    value={jstInput(hotel.prStartsAt)}
                    onChange={(v) => update({ prStartsAt: jstValue(v) })}
                  />
                  <Field
                    label="PR終了日時（日本時間）"
                    type="datetime-local"
                    value={jstInput(hotel.prEndsAt)}
                    onChange={(v) => update({ prEndsAt: jstValue(v) })}
                  />
                  <Field
                    label="PR枠内の優先順位（小さい順）"
                    type="number"
                    value={hotel.prOrder}
                    onChange={(v) => update({ prOrder: Number(v) })}
                  />
                </div>
                <Field
                  label="広告・提供関係の説明"
                  multiline
                  value={hotel.disclosure}
                  onChange={(disclosure) => update({ disclosure })}
                />
                <p className={css.note}>
                  期間終了後はPR優先掲載を解除します。提供関係の説明は保持します。契約金額・個人連絡先は入力しないでください。
                </p>
              </>
            )}
            {editTab === "preview" && (
              <>
                <h2>未保存の内容のプレビュー</h2>
                <p className={css.note}>
                  公開・予約手続きは行いません。予約リンクは実際の外部サイトへ移動します。
                </p>
                <HotelCatalogView
                  preview
                  catalog={{
                    ...catalog,
                    hotels: [
                      { ...hotel, status: "published", deletedAt: null },
                    ],
                    available: true,
                  }}
                />
              </>
            )}
          </fieldset>
          <div className={css.bottomSave}>
            <button className={css.secondary} disabled={busy} onClick={leave}>
              一覧へ戻る
            </button>
            <button
              className={css.primary}
              disabled={busy}
              onClick={() => void save()}
            >
              <Save size={15} />
              {busy ? "保存中…" : "保存する"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function MasterEditor({
  title,
  items,
  disabled,
  onSave,
}: {
  title: string;
  items: HotelMaster[];
  disabled: boolean;
  onSave: (item: HotelMaster) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<HotelMaster | null>(null);
  return (
    <section className={css.panel}>
      <h2>{title}</h2>
      {items.map((item) => (
        <div className={css.masterRow} key={item.id}>
          <strong>{item.name}</strong>
          <small>
            順位 {item.sortOrder} · {item.active ? "有効" : "無効"}
          </small>
          <button
            className={css.textButton}
            disabled={disabled}
            onClick={() => setDraft({ ...item })}
          >
            編集
          </button>
        </div>
      ))}
      <button
        className={css.secondary}
        disabled={disabled}
        onClick={() =>
          setDraft({
            id: "",
            name: "",
            sortOrder: (items.length + 1) * 10,
            active: true,
          })
        }
      >
        <Plus size={14} />
        {title}を追加
      </button>
      {draft && (
        <fieldset className={css.itemBox} disabled={disabled}>
          <Field
            label={`${title}の識別子`}
            disabled={items.some((i) => i.id === draft.id)}
            value={draft.id}
            onChange={(id) => setDraft({ ...draft, id })}
            hint="半角英数字とハイフン。保存後は固定です。"
          />
          <Field
            label={`${title}の名前`}
            value={draft.name}
            onChange={(name) => setDraft({ ...draft, name })}
          />
          <Field
            label={`${title}の表示順位`}
            type="number"
            value={draft.sortOrder}
            onChange={(v) => setDraft({ ...draft, sortOrder: Number(v) })}
          />
          <CheckField
            label="有効にする"
            checked={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
          <button
            className={css.primary}
            onClick={async () => {
              if (await onSave(draft)) setDraft(null);
            }}
          >
            設定を保存
          </button>
        </fieldset>
      )}
    </section>
  );
}
function HotelAnalytics({
  metrics,
  hotels,
}: {
  metrics: HotelMetric[];
  hotels: Hotel[];
}) {
  const total = (event: string) =>
    metrics
      .filter((m) => m.event_name === event)
      .reduce((sum, m) => sum + Number(m.event_count), 0);
  function csv() {
    const header = [
      "日付",
      "イベント",
      "ホテル",
      "予約サービス",
      "流入元",
      "設置場所",
      "回数",
    ];
    const rows = metrics.map((m) => [
      m.event_date,
      m.event_name,
      hotels.find((h) => h.id === m.hotel_id)?.name || m.hotel_id,
      m.provider,
      m.source,
      m.placement,
      m.event_count,
    ]);
    const text = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "hotel-analytics-30days.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className={css.tools}>
        <h2>直近30日間のホテル分析</h2>
        <button className={css.secondary} onClick={csv}>
          CSVをダウンロード
        </button>
      </div>
      <p className={css.note}>
        予約成立件数・確定報酬額は含みません。PR表示は画面内に半分以上が1秒表示された回数です。広告ブロックや通信失敗による欠測があります。
      </p>
      <div className={css.metrics}>
        {[
          ["hotel_list_view", "一覧閲覧"],
          ["hotel_view", "旧ホテル詳細の閲覧"],
          ["booking_click", "予約リンククリック"],
          ["hotel_guide_click", "ホテルガイドへの遷移"],
          ["pr_impression", "PR表示"],
          ["pr_click", "PRホテルの予約クリック"],
        ].map(([event, label]) => (
          <div key={event}>
            <span>{label}</span>
            <strong>{total(event).toLocaleString()}</strong>
          </div>
        ))}
      </div>
      <div className={css.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>ホテル</th>
              <th>詳細閲覧</th>
              <th>予約クリック</th>
              <th>PR表示</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => {
              const count = (event: string) =>
                metrics
                  .filter((m) => m.hotel_id === h.id && m.event_name === event)
                  .reduce((sum, m) => sum + Number(m.event_count), 0);
              return (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{count("hotel_view")}</td>
                  <td>{count("booking_click")}</td>
                  <td>{count("pr_impression")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={css.masterGrid}>
        {[
          ["provider", "予約サービス別クリック"],
          ["source", "流入元別のホテルガイド閲覧"],
        ].map(([key, title]) => {
          const selected = metrics.filter(
            (m) =>
              m.event_name ===
              (key === "provider" ? "booking_click" : "hotel_list_view"),
          );
          const counts = new Map<string, number>();
          for (const row of selected) {
            const label = row[key as "provider" | "source"] || "未指定";
            counts.set(
              label,
              (counts.get(label) || 0) + Number(row.event_count),
            );
          }
          return (
            <section className={css.panel} key={key}>
              <h2>{title}</h2>
              {[...counts].map(([label, count]) => (
                <p className={css.masterRow} key={label}>
                  <span>{BOOKING_PROVIDERS[label] || label}</span>
                  <strong>{count}</strong>
                </p>
              ))}
              {!counts.size && (
                <p className={css.note}>計測データはまだありません。</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
