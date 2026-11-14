import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistedTab } from "@/features/creator-page/hooks/usePersistedTab";

const KEY = "creator:aline:tab";
const VALID = ["community", "store"] as const;

describe("usePersistedTab", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts on the fallback and persists a valid tab", () => {
    const { result } = renderHook(() => usePersistedTab(KEY, "community", VALID));

    expect(result.current[0]).toBe("community");

    act(() => result.current[1]("store"));

    expect(result.current[0]).toBe("store");
    expect(window.localStorage.getItem(KEY)).toBe("store");
  });

  it("ignores a stored tab that is no longer available", () => {
    window.localStorage.setItem(KEY, "message");

    const { result } = renderHook(() => usePersistedTab(KEY, "community", VALID));

    expect(result.current[0]).toBe("community");
  });
});
