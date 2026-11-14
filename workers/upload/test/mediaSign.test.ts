import { beforeAll, describe, expect, it } from "vitest";
import { signMediaKey } from "../../../lib/mediaSigning";
import {
  timingSafeEqualString,
  verifyMediaKeySignature,
} from "../src/mediaSign";

const secret = "unit-test-media-signing-secret";
const key = "agaseke/posts/creator/asset.png";
const now = Math.floor(Date.now() / 1000);

beforeAll(() => {
  process.env.MEDIA_SIGNING_SECRET = secret;
});

describe("verifyMediaKeySignature", () => {
  it("accepts a signature produced by the app signer", async () => {
    const exp = now + 60;
    const signature = signMediaKey(key, exp);
    await expect(
      verifyMediaKeySignature(secret, key, exp, signature),
    ).resolves.toBe(true);
  });

  it("rejects a different key", async () => {
    const exp = now + 60;
    const signature = signMediaKey(key, exp);
    await expect(
      verifyMediaKeySignature(secret, `${key}.other`, exp, signature),
    ).resolves.toBe(false);
  });

  it("rejects an expired signature", async () => {
    const exp = now - 1;
    const signature = signMediaKey(key, exp);
    await expect(
      verifyMediaKeySignature(secret, key, exp, signature),
    ).resolves.toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const exp = now + 60;
    const signature = signMediaKey(key, exp);
    const tampered = `${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
    await expect(
      verifyMediaKeySignature(secret, key, exp, tampered),
    ).resolves.toBe(false);
  });

  it("rejects missing configuration", async () => {
    const exp = now + 60;
    const signature = signMediaKey(key, exp);
    await expect(
      verifyMediaKeySignature(undefined, key, exp, signature),
    ).resolves.toBe(false);
  });
});

describe("timingSafeEqualString", () => {
  it("matches only equal strings", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
    expect(timingSafeEqualString("abc", "ab")).toBe(false);
  });
});
