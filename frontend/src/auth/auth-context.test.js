import { describe, expect, it } from "vitest";
import { decodeToken, userFromToken } from "./auth-context.js";

function makeToken(claims) {
  const payload = btoa(JSON.stringify(claims));
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
}

describe("decodeToken", () => {
  it("returns null for an empty or missing token", () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken("")).toBeNull();
    expect(decodeToken(undefined)).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(decodeToken("not-a-jwt")).toBeNull();
    expect(decodeToken("a.b.c.d")).toBeNull();
    expect(decodeToken("...")).toBeNull();
  });

  it("decodes the payload claims of a valid token", () => {
    const claims = decodeToken(makeToken({ sub: "42", exp: 1234567890 }));
    expect(claims).toEqual({ sub: "42", exp: 1234567890 });
  });
});

describe("userFromToken", () => {
  it("returns null when there is no subject claim", () => {
    expect(userFromToken(makeToken({ exp: 1234567890 }))).toBeNull();
    expect(userFromToken(null)).toBeNull();
  });

  it("maps the subject claim to the user id", () => {
    expect(userFromToken(makeToken({ sub: "7", exp: 1 }))).toEqual({ id: "7" });
  });
});
