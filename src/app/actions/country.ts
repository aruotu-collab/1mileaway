"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COUNTRY_COOKIE } from "@/lib/constants";
import { isLaunchCountry, pathForCountry } from "@/lib/countries/catalog";

export async function setVisitorCountry(formData: FormData) {
  const iso2 = String(formData.get("country") ?? "").toLowerCase();
  if (!isLaunchCountry(iso2)) redirect("/");
  const jar = await cookies();
  jar.set(COUNTRY_COOKIE, iso2, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(pathForCountry(String(formData.get("next") ?? "/"), iso2));
}
