import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  MAX_UPLOAD_MB,
  absoluteImageUrl,
  describeUploadError,
} from "./pages/WardrobePage.jsx";

describe("WardrobePage categories", () => {
  it("declares all five fixed categories", () => {
    expect(CATEGORIES).toEqual([
      "Oberteil",
      "Hose",
      "Kleid",
      "Schuhe",
      "Accessoire",
    ]);
  });
});

describe("absoluteImageUrl", () => {
  it("returns null for a missing image", () => {
    expect(absoluteImageUrl(null)).toBeNull();
    expect(absoluteImageUrl(undefined)).toBeNull();
  });

  it("leaves an already-absolute URL untouched", () => {
    expect(absoluteImageUrl("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
  });

  it("prefixes a relative image URL with the API base", () => {
    expect(absoluteImageUrl("/api/items/7/image")).toBe(
      "http://localhost:8000/api/items/7/image",
    );
  });
});

describe("describeUploadError", () => {
  it("maps a 413 status to a readable size message", () => {
    const message = describeUploadError({ status: 413, message: "x" });
    expect(message).toContain("zu groß");
    expect(message).toContain(String(MAX_UPLOAD_MB));
  });

  it("forwards a readable backend detail for a 400", () => {
    expect(describeUploadError({ status: 400, message: "ungültige Kategorie" })).toBe(
      "ungültige Kategorie",
    );
  });

  it("falls back to a generic message when no error is available", () => {
    expect(describeUploadError(null)).toContain("nicht ausgeführt");
  });
});
