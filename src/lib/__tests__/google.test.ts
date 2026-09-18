import { describe, expect, it } from "vitest";
import { googleMeasurementId, googleSiteVerification, shouldLoadGoogleAnalytics } from "@/lib/google";

describe("googleMeasurementId", () => {
  it("only accepts GA4 measurement ids", () => {
    expect(googleMeasurementId("G-ABC123XYZ")).toBe("G-ABC123XYZ");
    expect(googleMeasurementId(" g-abc123xyz ")).toBe("G-ABC123XYZ");
    expect(googleMeasurementId("UA-123")).toBeNull();
    expect(googleMeasurementId("G-<script>")).toBeNull();
  });
});

describe("googleSiteVerification", () => {
  it("only accepts the Search Console meta token", () => {
    expect(googleSiteVerification("AbC_123-xyz")).toBe("AbC_123-xyz");
    expect(googleSiteVerification("not a token!")).toBeNull();
  });
});

describe("shouldLoadGoogleAnalytics", () => {
  it("stays off until production unless debug is on", () => {
    const previousDebug = process.env.NEXT_PUBLIC_GA_DEBUG;
    const previousVercel = process.env.VERCEL_ENV;
    const previousId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABC123XYZ";
    process.env.NEXT_PUBLIC_GA_DEBUG = "0";
    process.env.VERCEL_ENV = "development";
    expect(shouldLoadGoogleAnalytics()).toBe(false);
    process.env.VERCEL_ENV = "production";
    expect(shouldLoadGoogleAnalytics()).toBe(true);
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_GA_DEBUG = "1";
    expect(shouldLoadGoogleAnalytics()).toBe(true);
    process.env.NEXT_PUBLIC_GA_DEBUG = previousDebug;
    process.env.VERCEL_ENV = previousVercel;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previousId;
  });
});
