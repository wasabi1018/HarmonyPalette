import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  emptyState,
  japanDay,
  mergeForUpdate,
  projectPublic,
  pruneState,
  validateConfig,
} from "./model";
import { loadInputs } from "./sources";
import { fetchJma, mergeWeather } from "./weather";
import { fetchHolidays } from "./holidays";
import type { ForecastState } from "./types";

type Row = {
  revision: number;
  payload: ForecastState | Record<string, never>;
  last_attempt_day: string | null;
  lease_until: string | null;
};
function client() {
  const c = getSupabaseAdminClient();
  if (!c) throw new Error("Supabaseのサーバー設定が必要です。");
  return c;
}
function unpack(row: Row) {
  return {
    revision: Number(row.revision),
    state: row.payload.config ? (row.payload as ForecastState) : emptyState(),
    lastAttempt: row.last_attempt_day,
    running: !!row.lease_until && Date.parse(row.lease_until) > Date.now(),
  };
}
export async function readForecast() {
  const { data, error } = await client()
    .from("crowd_forecast_state")
    .select("revision,payload,last_attempt_day,lease_until")
    .eq("id", "main")
    .single();
  if (error || !data)
    throw new Error(
      "混雑予想の保存先が未設定か、読み取りに失敗しました。DBマイグレーションを確認してください。",
    );
  return unpack(data as Row);
}
async function write(
  revision: number,
  state: ForecastState,
  token: string | null = null,
) {
  const { data, error } = await client().rpc("crowd_forecast_write", {
    p_revision: revision,
    p_payload: state,
    p_token: token,
  });
  if (error) throw new Error("混雑予想の保存に失敗しました。");
  if (!data?.[0])
    throw new Error(
      "他の更新が行われました。再読み込みしてから保存してください。",
    );
  return unpack(data[0] as Row);
}
export async function readPublicForecast(now = new Date()) {
  try {
    return projectPublic((await readForecast()).state, now);
  } catch {
    return projectPublic(emptyState(), now);
  }
}
export async function previewConfig(
  value: unknown,
  revision: number,
  now = new Date(),
) {
  const current = await readForecast();
  if (current.revision !== revision || current.running)
    throw new Error("他の更新が行われています。再読み込みしてください。");
  const config = validateConfig(value),
    state = { ...current.state, config };
  const inputs = await loadInputs(state, japanDay(now));
  return { revision, state: mergeForUpdate(state, inputs, null, now) };
}
export async function saveConfig(
  value: unknown,
  revision: number,
  now = new Date(),
) {
  const preview = await previewConfig(value, revision, now),
    current = await readForecast();
  preview.state.history = [
    { at: now.toISOString(), config: current.state.config },
    ...current.state.history,
  ].slice(0, 20);
  return write(revision, preview.state);
}
export async function updateForecast(now = new Date()) {
  const today = japanDay(now),
    token = randomUUID();
  const { data, error } = await client().rpc("crowd_forecast_claim", {
    p_day: today,
    p_token: token,
  });
  if (error)
    throw new Error(
      "更新ロックを取得できませんでした。DB設定を確認してください。",
    );
  if (!data?.[0])
    return {
      skipped: true,
      reason: "本日の取得は実行済み、または更新中です。",
    };
  const { state, revision } = unpack(data[0] as Row);
  let weather = mergeWeather(
    state.weatherCache,
    Object.keys(state.weatherCache),
  );
  let next: ForecastState = { ...state, lastAttempt: today, error: null };
  try {
    // Refresh official dates in the batch; on failure keep the bundled/previously saved dates.
    try {
      Object.assign(next, await fetchHolidays());
    } catch {
      /* Existing dates remain authoritative within their published years. */
    }
    try {
      const fetched = await fetchJma(state.weatherCache, now);
      next.weatherCache = fetched.cache;
      weather = fetched.days;
    } catch {
      next.error =
        "気象庁の取得が遅れています。有効な保存済み予報を使用しています。";
    }
    const inputs = await loadInputs(next, today);
    next = mergeForUpdate(next, inputs, weather, now);
    await write(revision, next, token);
    return {
      skipped: false,
      count: Object.keys(next.days).length,
      weatherDelayed: !!next.error,
    };
  } catch (error) {
    await write(
      revision,
      {
        ...state,
        lastAttempt: today,
        error:
          "混雑予想の更新に失敗しました。次回更新まで公開済みの予想を保持します。",
      },
      token,
    );
    throw error;
  }
}
export async function cleanupForecast(now = new Date()) {
  const current = await readForecast();
  if (current.running) return { skipped: true };
  await write(current.revision, pruneState(current.state, japanDay(now)));
  return { skipped: false };
}
