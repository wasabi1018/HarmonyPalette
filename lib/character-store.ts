"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@/data/types";
import { characters as sampleCharacters } from "@/data/site-data";
import type { DataLoadStatus } from "@/lib/schedule-store";

const REFRESH_EVENT = "harmony-palette:characters-refresh";

export function compareCharacters(a: Character, b: Character) {
  const orderDifference = (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
  if (orderDifference !== 0) return orderDifference;
  return (a.nameKana || a.name).localeCompare(b.nameKana || b.name, "ja")
    || a.name.localeCompare(b.name, "ja")
    || a.id.localeCompare(b.id);
}

export function sortCharacterNames(names: string[], catalog: Character[]) {
  const characterByName = new Map(catalog.map((character) => [character.name, character]));
  return Array.from(new Set(names)).sort((left, right) => {
    const leftCharacter = characterByName.get(left);
    const rightCharacter = characterByName.get(right);
    if (leftCharacter && rightCharacter) return compareCharacters(leftCharacter, rightCharacter);
    if (leftCharacter) return -1;
    if (rightCharacter) return 1;
    return left.localeCompare(right, "ja");
  });
}

function virtualCharacterId(name: string) {
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `imported-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function mergeCharactersWithNames(catalog: Character[], names: string[]) {
  const byName = new Map(catalog.map((character) => [character.name, character]));
  Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).forEach((name) => {
    if (byName.has(name)) return;
    const id = virtualCharacterId(name);
    byName.set(name, {
      id,
      slug: id,
      name,
      nameKana: name,
      image: "/character-placeholder.svg",
      description: "取り込んだスケジュールに登場するキャラクターです。",
      officialUrl: "https://www.harmonyland.jp/",
      isFanStudioRegular: false,
      themeColor: "#ef8099",
      displayOrder: 999,
      birthdayMonth: null,
      birthdayDay: null,
    });
  });
  return Array.from(byName.values()).sort(compareCharacters);
}

export function refreshCharacters() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

type UseCharactersOptions = {
  initialCharacters?: Character[];
  initialStatus?: DataLoadStatus;
  fallbackToSamples?: boolean;
};

type RegisteredCharacterResult = {
  configured: boolean;
  characters: Character[];
};

let registeredCharacterCache: RegisteredCharacterResult | null = null;
let registeredCharacterRequest: Promise<RegisteredCharacterResult> | null = null;

function loadRegisteredCharacters(force = false) {
  if (registeredCharacterRequest) return registeredCharacterRequest;
  if (!force && registeredCharacterCache) return Promise.resolve(registeredCharacterCache);
  if (force) registeredCharacterCache = null;

  registeredCharacterRequest = fetch("/api/characters", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("キャラクター一覧を取得できませんでした。");
      return response.json() as Promise<RegisteredCharacterResult>;
    })
    .then((result) => {
      registeredCharacterCache = result;
      return result;
    })
    .finally(() => {
      registeredCharacterRequest = null;
    });

  return registeredCharacterRequest;
}

export function useCharacters({
  initialCharacters,
  initialStatus,
  fallbackToSamples = false,
}: UseCharactersOptions = {}) {
  const [remoteCharacters, setRemoteCharacters] = useState<Character[] | null>(initialCharacters ?? null);
  const remoteCharactersRef = useRef<Character[] | null>(initialCharacters ?? null);
  const [status, setStatus] = useState<DataLoadStatus>(
    initialStatus ?? (initialCharacters ? "success" : "loading"),
  );
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setRevision((current) => current + 1);
    window.addEventListener(REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, handleRefresh);
  }, []);

  useEffect(() => {
    let active = true;
    const hasPreviousData = remoteCharactersRef.current !== null;
    if (hasPreviousData) {
      setIsRefreshing(true);
    } else {
      setStatus("loading");
    }
    setError("");

    loadRegisteredCharacters(revision > 0)
      .then((result) => {
        if (!active) return;
        if (!result.configured) {
          setStatus("unavailable");
          return;
        }
        remoteCharactersRef.current = result.characters;
        setRemoteCharacters(result.characters);
        setStatus("success");
      })
      .catch((caughtError: unknown) => {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "キャラクター一覧を取得できませんでした。");
        setStatus("error");
      })
      .finally(() => {
        if (active) setIsRefreshing(false);
      });
    return () => { active = false; };
  }, [revision]);

  const characters = useMemo(
    () => [...(remoteCharacters ?? (fallbackToSamples ? sampleCharacters : []))].sort(compareCharacters),
    [fallbackToSamples, remoteCharacters],
  );

  const retry = useCallback(() => setRevision((current) => current + 1), []);

  return { characters, status, error, isRefreshing, retry };
}
