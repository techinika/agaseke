export type WorkerFirestoreStatus =
  | "connected"
  | "failing"
  | "unverified"
  | "unreachable";

export interface WorkerDefinition {
  id: string;
  name: string;
  service: string;
  url: string;
  role: string;
}

export interface WorkerHealthResult {
  id: string;
  name: string;
  service: string;
  url: string;
  role: string;
  workerReachable: boolean;
  firestoreStatus: WorkerFirestoreStatus;
  httpStatus: number | null;
  firestoreHttpStatus: number | null;
  stage: string | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface RecentDbFailure {
  id: string;
  method: string;
  path: string;
  status: number | null;
  error: string;
  durationMs: number | null;
  createdAt: string | null;
}

export interface WorkerDiagnosticsReport {
  checkedAt: string;
  summary: {
    total: number;
    connected: number;
    failing: number;
    unreachable: number;
    unverified: number;
    allConnected: boolean;
  };
  workers: WorkerHealthResult[];
  recentDbFailures: RecentDbFailure[];
}

export interface ProbeOptions {
  internalAuthSecret?: string;
  authorizationHeader?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function normalizeWorkerUrl(raw: string | undefined, fallback: string): string {
  const candidate = (raw || "").trim() || fallback;
  return candidate.replace(/\/+$/, "");
}

export function getConfiguredWorkers(
  env: Record<string, string | undefined> = process.env,
): WorkerDefinition[] {
  return [
    {
      id: "payments",
      name: "Payments",
      service: "agaseke-payments",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_PAYMENTS_WORKER_URL,
        "https://payments.api.agaseke.me",
      ),
      role: "Checkouts, webhooks, retries & FX rates",
    },
    {
      id: "support",
      name: "Support",
      service: "agaseke-support",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_SUPPORT_WORKER_URL,
        "https://support.api.agaseke.me",
      ),
      role: "Tips, gifts & creator earnings callbacks",
    },
    {
      id: "store",
      name: "Store",
      service: "agaseke-store",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_STORE_WORKER_URL,
        "https://store.api.agaseke.me",
      ),
      role: "Store orders, fulfillment & digital downloads",
    },
    {
      id: "bookings",
      name: "Bookings",
      service: "agaseke-bookings",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_BOOKINGS_WORKER_URL,
        "https://bookings.api.agaseke.me",
      ),
      role: "Creator session bookings & availability",
    },
    {
      id: "community",
      name: "Community",
      service: "agaseke-community",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_COMMUNITY_WORKER_URL,
        "https://community.api.agaseke.me",
      ),
      role: "Tiers, subscriptions & auto-renewals",
    },
    {
      id: "comms",
      name: "Comms",
      service: "agaseke-comms",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_COMMS_WORKER_URL,
        "https://comms.api.agaseke.me",
      ),
      role: "Transactional & queued SES emails",
    },
    {
      id: "general",
      name: "General",
      service: "agaseke-general",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_GENERAL_WORKER_URL,
        "https://api.agaseke.me",
      ),
      role: "Encryption, notifications & activity logs",
    },
    {
      id: "upload",
      name: "Upload",
      service: "agaseke-upload",
      url: normalizeWorkerUrl(
        env.NEXT_PUBLIC_UPLOAD_WORKER_URL,
        "https://upload.api.agaseke.me",
      ),
      role: "R2 media uploads & asset metadata",
    },
  ];
}

function sanitizeErrorText(raw: string, maxLen = 200): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

interface WorkerHealthPayload {
  status?: string;
  service?: string;
  error?: string;
  firestore?: {
    ok?: boolean;
    latencyMs?: number;
    httpStatus?: number | null;
    stage?: string;
    error?: string;
  };
}

export async function probeWorkerHealth(
  worker: WorkerDefinition,
  options: ProbeOptions = {},
): Promise<WorkerHealthResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.internalAuthSecret?.trim()) {
    headers["X-Internal-Auth"] = options.internalAuthSecret.trim();
  }
  if (options.authorizationHeader?.trim()) {
    headers.Authorization = options.authorizationHeader.trim();
  }

  try {
    const res = await fetchImpl(`${worker.url}/health?check=db`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsedMs = Date.now() - startedAt;
    let payload: WorkerHealthPayload | null = null;
    const rawText = await res.text();
    try {
      payload = JSON.parse(rawText) as WorkerHealthPayload;
    } catch {
      payload = null;
    }

    if (payload && payload.firestore && typeof payload.firestore.ok === "boolean") {
      if (payload.firestore.ok) {
        return {
          ...worker,
          workerReachable: true,
          firestoreStatus: "connected",
          httpStatus: res.status,
          firestoreHttpStatus:
            typeof payload.firestore.httpStatus === "number"
              ? payload.firestore.httpStatus
              : 200,
          stage: null,
          latencyMs:
            typeof payload.firestore.latencyMs === "number"
              ? payload.firestore.latencyMs
              : elapsedMs,
          error: null,
          checkedAt,
        };
      }

      return {
        ...worker,
        workerReachable: true,
        firestoreStatus: "failing",
        httpStatus: res.status,
        firestoreHttpStatus:
          typeof payload.firestore.httpStatus === "number"
            ? payload.firestore.httpStatus
            : null,
        stage: payload.firestore.stage || "firestore",
        latencyMs:
          typeof payload.firestore.latencyMs === "number"
            ? payload.firestore.latencyMs
            : elapsedMs,
        error: sanitizeErrorText(
          payload.firestore.error ||
            payload.error ||
            `Firestore probe failed (HTTP ${res.status})`,
        ),
        checkedAt,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ...worker,
        workerReachable: true,
        firestoreStatus: "failing",
        httpStatus: res.status,
        firestoreHttpStatus: null,
        stage: "auth",
        latencyMs: elapsedMs,
        error: sanitizeErrorText(
          payload?.error || `Worker rejected diagnostic probe authentication (HTTP ${res.status})`,
        ),
        checkedAt,
      };
    }

    if (res.ok || res.status === 404 || res.status === 405) {
      return {
        ...worker,
        workerReachable: true,
        firestoreStatus: "unverified",
        httpStatus: res.status,
        firestoreHttpStatus: null,
        stage: "deploy",
        latencyMs: elapsedMs,
        error:
          res.ok
            ? "Worker responded without Firestore diagnostics; redeploy worker to enable live DB checks."
            : `Worker returned HTTP ${res.status} on /health?check=db; redeploy worker to enable live DB checks.`,
        checkedAt,
      };
    }

    return {
      ...worker,
      workerReachable: false,
      firestoreStatus: "unreachable",
      httpStatus: res.status,
      firestoreHttpStatus: null,
      stage: "worker",
      latencyMs: elapsedMs,
      error: sanitizeErrorText(
        payload?.error || `Worker health endpoint returned HTTP ${res.status}`,
      ),
      checkedAt,
    };
  } catch (err: unknown) {
    const rawMsg =
      err instanceof Error
        ? err.name === "TimeoutError" || err.name === "AbortError"
          ? `Timed out after ${timeoutMs}ms`
          : err.message
        : "Failed to reach worker";

    return {
      ...worker,
      workerReachable: false,
      firestoreStatus: "unreachable",
      httpStatus: null,
      firestoreHttpStatus: null,
      stage: "network",
      latencyMs: Date.now() - startedAt,
      error: sanitizeErrorText(rawMsg || "Worker unreachable"),
      checkedAt,
    };
  }
}

export async function runWorkerDiagnostics(
  options: ProbeOptions & {
    env?: Record<string, string | undefined>;
    recentDbFailures?: RecentDbFailure[];
  } = {},
): Promise<WorkerDiagnosticsReport> {
  const definitions = getConfiguredWorkers(options.env);
  const workers = await Promise.all(
    definitions.map((worker) => probeWorkerHealth(worker, options)),
  );

  const connected = workers.filter((w) => w.firestoreStatus === "connected").length;
  const failing = workers.filter((w) => w.firestoreStatus === "failing").length;
  const unreachable = workers.filter((w) => w.firestoreStatus === "unreachable").length;
  const unverified = workers.filter((w) => w.firestoreStatus === "unverified").length;

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      total: workers.length,
      connected,
      failing,
      unreachable,
      unverified,
      allConnected: failing === 0 && unreachable === 0 && unverified === 0,
    },
    workers,
    recentDbFailures: options.recentDbFailures ?? [],
  };
}
