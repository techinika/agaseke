import { describe, expect, it } from "vitest";
import { isBareMediaKey, storedAssetVisibility } from "../../../lib/mediaKey";
import { isValidPrivateKey } from "../src/index";

describe("media key validation", () => {
  it("accepts object keys without a scheme", () => {
    expect(isBareMediaKey("agaseke/posts/creator/file.png")).toBe(true);
    expect(isValidPrivateKey("agaseke/posts/creator/file.png")).toBe(true);
  });

  it("rejects URLs and traversal", () => {
    for (const value of [
      "https://assets.agaseke.me/agaseke/posts/a.png",
      "//assets.agaseke.me/a.png",
      "/agaseke/posts/a.png",
      "agaseke/../secret.png",
      "../secret.png",
    ]) {
      expect(isBareMediaKey(value)).toBe(false);
    }
  });

  it("rejects ambiguous worker keys", () => {
    expect(isValidPrivateKey("/absolute.png")).toBe(false);
    expect(isValidPrivateKey("agaseke/../secret.png")).toBe(false);
    expect(isValidPrivateKey("agaseke\\posts\\a.png")).toBe(false);
    expect(isValidPrivateKey("agaseke/posts/\u0000a.png")).toBe(false);
    expect(isValidPrivateKey("")).toBe(false);
    expect(isValidPrivateKey("a".repeat(1025))).toBe(false);
  });
});

describe("storedAssetVisibility", () => {
  it("classifies public URLs and private keys", () => {
    expect(storedAssetVisibility("https://assets.agaseke.me/a.png")).toBe(
      "public",
    );
    expect(storedAssetVisibility("agaseke/posts/a.png")).toBe("private");
    expect(storedAssetVisibility(["agaseke/posts/a.png"])).toBe("private");
  });

  it("returns null for empty or unknown values", () => {
    expect(storedAssetVisibility("")).toBeNull();
    expect(storedAssetVisibility(null)).toBeNull();
    expect(storedAssetVisibility("ftp://assets.agaseke.me/a.png")).toBeNull();
  });
});
