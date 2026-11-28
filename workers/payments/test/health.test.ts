import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleHealthRequest, type HealthEnv } from "../src/health";

function makeEnv(overrides: Partial<HealthEnv> = {}): HealthEnv {
  return {
    FIREBASE_API_KEY: "test-api-key",
    FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_CLIENT_EMAIL: "svc@test-project.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "invalid-or-mocked",
    INTERNAL_AUTH_SECRET: "internal-secret",
    ...overrides,
  };
}

describe("worker /health endpoint", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns minimal public ok response when check=db is absent", async () => {
    const res = await handleHealthRequest(
      new Request("https://payments.api.agaseke.me/health"),
      makeEnv(),
      "agaseke-payments",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "agaseke-payments" });
  });

  it("rejects unauthorized ?check=db probes", async () => {
    const res = await handleHealthRequest(
      new Request("https://payments.api.agaseke.me/health?check=db"),
      makeEnv(),
      "agaseke-payments",
    );
    expect(res.status).toBe(401);
  });

  it("returns 503 degraded when Firebase service account env vars are missing", async () => {
    const res = await handleHealthRequest(
      new Request("https://payments.api.agaseke.me/health?check=db", {
        headers: { "X-Internal-Auth": "internal-secret" },
      }),
      makeEnv({ FIREBASE_PRIVATE_KEY: "" }),
      "agaseke-payments",
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      firestore: { ok: boolean; stage: string; error: string };
    };
    expect(body.status).toBe("degraded");
    expect(body.firestore.ok).toBe(false);
    expect(body.firestore.stage).toBe("config");
    expect(body.firestore.error).toContain("FIREBASE_PRIVATE_KEY");
  });

  it("returns 503 degraded when Firestore returns permission error", async () => {
    vi.doMock("jose", async () => {
      const actual = await vi.importActual<typeof import("jose")>("jose");
      return {
        ...actual,
        importPKCS8: vi.fn(async () => ({})),
        SignJWT: class {
          setProtectedHeader() {
            return this;
          }
          async sign() {
            return "mock-jwt";
          }
        },
      };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({ access_token: "fs-access-token", expires_in: 3600 }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            error: { message: "Missing or insufficient permissions", status: "PERMISSION_DENIED" },
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const { handleHealthRequest: probed } = await import("../src/health");
    const res = await probed(
      new Request("https://payments.api.agaseke.me/health?check=db", {
        headers: { "X-Internal-Auth": "internal-secret" },
      }),
      makeEnv(),
      "agaseke-payments",
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      firestore: { ok: boolean; httpStatus: number; stage: string; error: string };
    };
    expect(body.status).toBe("degraded");
    expect(body.firestore.ok).toBe(false);
    expect(body.firestore.httpStatus).toBe(403);
    expect(body.firestore.stage).toBe("firestore");
    expect(body.firestore.error).toContain("Missing or insufficient permissions");
  });

  it("returns 200 ok with firestore status when OAuth and Firestore REST succeed", async () => {
    vi.doMock("jose", async () => {
      const actual = await vi.importActual<typeof import("jose")>("jose");
      return {
        ...actual,
        importPKCS8: vi.fn(async () => ({})),
        SignJWT: class {
          setProtectedHeader() {
            return this;
          }
          async sign() {
            return "mock-jwt";
          }
        },
      };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({ access_token: "fs-access-token", expires_in: 3600 }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ documents: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const { handleHealthRequest: probed } = await import("../src/health");
    const res = await probed(
      new Request("https://payments.api.agaseke.me/health?check=db", {
        headers: { "X-Internal-Auth": "internal-secret" },
      }),
      makeEnv(),
      "agaseke-payments",
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      service: string;
      firestore: { ok: boolean; httpStatus: number };
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("agaseke-payments");
    expect(body.firestore.ok).toBe(true);
    expect(body.firestore.httpStatus).toBe(200);
  });
});
