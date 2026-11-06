import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseLanguage, loadLanguagePreference, saveLanguagePreference } from "./language";

describe("chooseLanguage", () => {
  it("uses the user's own choice before anything the browser says", () => {
    expect(chooseLanguage("en", ["sv-SE"])).toBe("en");
    expect(chooseLanguage("sv", ["en-US"])).toBe("sv");
  });

  it("follows the first language the browser asks for that the app has", () => {
    expect(chooseLanguage(null, ["sv-SE", "en-US"])).toBe("sv");
    expect(chooseLanguage(null, ["de-DE", "sv", "en"])).toBe("sv");
    expect(chooseLanguage(null, ["fr", "en-GB", "sv"])).toBe("en");
  });

  it("matches the language whatever the case or the region", () => {
    expect(chooseLanguage(null, ["SV-fi"])).toBe("sv");
  });

  it("falls back to English when the browser asks for nothing the app has, or says nothing", () => {
    expect(chooseLanguage(null, ["de-DE", "fr"])).toBe("en");
    expect(chooseLanguage(null, [])).toBe("en");
  });
});

describe("the saved choice", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
    const data = new Map(Object.entries(initial));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    });
    return data;
  }

  it("is remembered under the key of the app, and read back", () => {
    const data = stubStorage();
    saveLanguagePreference("sv");
    expect(data.get("advanced-savings-calculator:language")).toBe("sv");
    expect(loadLanguagePreference()).toBe("sv");
  });

  it("is none when nothing is saved, or when the saved text is not a language", () => {
    stubStorage();
    expect(loadLanguagePreference()).toBeNull();
    stubStorage({ "advanced-savings-calculator:language": "klingon" });
    expect(loadLanguagePreference()).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    expect(loadLanguagePreference()).toBeNull();
    expect(() => saveLanguagePreference("en")).not.toThrow();
  });
});
