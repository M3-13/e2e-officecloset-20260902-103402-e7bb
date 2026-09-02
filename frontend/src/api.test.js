import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api.js";

const BASE = "http://localhost:8000";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe("api client surface", () => {
  it("exports the full function surface", () => {
    const names = [
      "register",
      "login",
      "listItems",
      "createItem",
      "updateItem",
      "deleteItem",
      "listOutfits",
      "createOutfit",
      "updateOutfit",
      "deleteOutfit",
      "deleteAccount",
    ];
    for (const name of names) {
      expect(typeof api[name]).toBe("function");
    }
  });
});

describe("api client requests", () => {
  beforeEach(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  it("login posts credentials as JSON to the auth endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ access_token: "abc", token_type: "bearer" }),
    );
    globalThis.fetch = fetchMock;

    const result = await api.login("a@b.c", "secret");

    expect(result.access_token).toBe("abc");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/auth/login`);
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(opts.body)).toEqual({ email: "a@b.c", password: "secret" });
  });

  it("attachs the bearer token from localStorage to protected requests", async () => {
    localStorage.setItem("officecloset_token", "tok123");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    globalThis.fetch = fetchMock;

    await api.listItems();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/items`);
    expect(opts.headers.Authorization).toBe("Bearer tok123");
  });

  it("listItems appends the category query parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    globalThis.fetch = fetchMock;

    await api.listItems("Hose");

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/items?category=Hose`);
  });

  it("createItem sends a multipart FormData body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, name: "x", category: "Hose", image_url: null }, 201),
    );
    globalThis.fetch = fetchMock;

    await api.createItem({ name: "x", category: "Hose" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/items`);
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get("name")).toBe("x");
    expect(opts.body.get("category")).toBe("Hose");
  });

  it("throws a readable error carrying the status on a failed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ detail: "ungültige Anmeldung" }, 401),
    );
    globalThis.fetch = fetchMock;

    await expect(api.login("a@b.c", "wrong")).rejects.toThrow("ungültige Anmeldung");
    await expect(api.login("a@b.c", "wrong")).rejects.toMatchObject({ status: 401 });
  });

  it("deleteAccount targets the users/me endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => "" });
    globalThis.fetch = fetchMock;

    const result = await api.deleteAccount();

    expect(result).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/users/me`);
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});
