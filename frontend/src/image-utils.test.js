import { describe, expect, it } from "vitest";
import { resolveImageUrl } from "./image-utils.js";

describe("resolveImageUrl", () => {
  it("returns null for missing images", () => {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl("")).toBeNull();
  });

  it("prepends the api base to relative urls", () => {
    expect(resolveImageUrl("/api/items/1/image")).toBe(
      "http://localhost:8000/api/items/1/image",
    );
  });

  it("leaves absolute urls untouched", () => {
    expect(resolveImageUrl("https://cdn.example.com/x.png")).toBe(
      "https://cdn.example.com/x.png",
    );
  });
});
