"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataLoadStatus } from "@/lib/schedule-store";

export type ParkOperatingDay = {
  id: string;
  date: string;
  operatingStatus: "open" | "closed" | "unknown";
  openingTime?: string;
  closingTime?: string;
  sourceTitle: string;
  notes: string;
  officialUrl: string;
  updatedAt: string;
};

export type InitialParkOperatingDayData = {
  operatingDays: ParkOperatingDay[];
  status: DataLoadStatus;
  error: string;
};

type PublishedParkOperatingDayResult = {
  configured: boolean;
  operatingDays: ParkOperatingDay[];
};

let publishedCache: PublishedParkOperatingDayResult | null = null;
let publishedRequest: Promise<PublishedParkOperatingDayResult> | null = null;

function loadPublishedParkOperatingDays(force = false) {
  if (publishedRequest) return publishedRequest;
  if (!force && publishedCache) return Promise.resolve(publishedCache);
  if (force) publishedCache = null;

  publishedRequest = fetch("/api/park-operating-days", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("公開営業情報を取得できませんでした。");
      return response.json() as Promise<PublishedParkOperatingDayResult>;
    })
    .then((result) => {
      publishedCache = result;
      return result;
    })
    .finally(() => {
      publishedRequest = null;
    });

  return publishedRequest;
}

export function useParkOperatingDays(initialData: InitialParkOperatingDayData) {
  const initialDays = initialData.status === "success" ? initialData.operatingDays : [];
  const [operatingDays, setOperatingDays] = useState(initialDays);
  const operatingDaysRef = useRef(initialDays);
  const [status, setStatus] = useState<DataLoadStatus>(initialData.status);
  const [error, setError] = useState(initialData.error);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (revision === 0) return;
    let active = true;
    if (operatingDaysRef.current.length > 0) setIsRefreshing(true);
    else setStatus("loading");
    setError("");

    loadPublishedParkOperatingDays(true)
      .then((result) => {
        if (!active) return;
        if (!result.configured) {
          setStatus("unavailable");
          return;
        }
        operatingDaysRef.current = result.operatingDays;
        setOperatingDays(result.operatingDays);
        setStatus("success");
      })
      .catch((caughtError: unknown) => {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "公開営業情報を取得できませんでした。");
        setStatus("error");
      })
      .finally(() => {
        if (active) setIsRefreshing(false);
      });
    return () => { active = false; };
  }, [revision]);

  const retry = useCallback(() => setRevision((current) => current + 1), []);
  return { operatingDays, status, error, isRefreshing, retry };
}
