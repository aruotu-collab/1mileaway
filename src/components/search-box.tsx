"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { goToMarketplace, labelForCoordinates } from "@/app/actions/search";
import { LocationField } from "@/components/location-field";
import { UrgencyTabs } from "@/components/urgency-tabs";
import type { LocationChoice } from "@/lib/locations/suggest";
import { groupedProfessions, type ProfessionChoice } from "@/lib/professions";

export function SearchBox({
  country = "gb",
  defaultProfession = "plumbers",
  defaultLocation = "",
  emergency = false,
  showUrgencyTabs = true,
  regularHref,
  emergencyHref,
  professions = [],
  locations = [],
}: {
  country?: string;
  defaultProfession?: string;
  defaultLocation?: string;
  emergency?: boolean;
  showUrgencyTabs?: boolean;
  regularHref?: string;
  emergencyHref?: string;
  professions?: ProfessionChoice[];
  locations?: LocationChoice[];
}) {
  const router = useRouter();
  const inputId = useId();
  const [pending, setPending] = useState(false);
  const [location, setLocation] = useState(defaultLocation);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(emergency);
  const [error, setError] = useState<string | null>(null);
  const [profession, setProfession] = useState(
    professions.find((item) => item.slug === defaultProfession)?.slug ??
      professions[0]?.slug ??
      "plumbers",
  );

  useEffect(() => {
    setLocation(defaultLocation);
    setLat("");
    setLng("");
    setGeoStatus(null);
  }, [defaultLocation]);

  useEffect(() => {
    setIsEmergency(emergency);
  }, [emergency]);

  useEffect(() => {
    setProfession(
      professions.find((item) => item.slug === defaultProfession)?.slug ??
        professions[0]?.slug ??
        "plumbers",
    );
  }, [defaultProfession, professions]);

  function onLocationChange(value: string) {
    setLocation(value);
    setLat("");
    setLng("");
    setGeoStatus(null);
    setError(null);
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("This browser cannot share your location. Type a postcode or address instead.");
      return;
    }
    setGeoStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLat(String(nextLat));
        setLng(String(nextLng));
        const label = await labelForCoordinates(country, nextLat, nextLng);
        setLocation(label);
        setGeoStatus(`Using ${label}`);
        setError(null);
      },
      () => {
        setGeoStatus("Location permission was denied. Type a postcode or address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form
      className="card grid gap-3 p-4"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!location.trim() && !lat) {
          setError("Choose where you need help — pick an area, use your location, or type a postcode.");
          return;
        }
        const formData = new FormData(event.currentTarget);
        setError(null);
        setPending(true);
        void (async () => {
          try {
            const result = await goToMarketplace(formData);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            router.push(result.href);
          } catch {
            setError("Search did not finish. Try again.");
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      {showUrgencyTabs ? (
        <div>
          <UrgencyTabs
            emergency={isEmergency}
            regularHref={regularHref}
            emergencyHref={emergencyHref}
            onChange={regularHref || emergencyHref ? undefined : setIsEmergency}
          />
          <p className="mt-2 text-xs text-ink-soft sm:text-sm">
            {isEmergency
              ? "Emergency shows people who can help right now."
              : "Nearest shows the closest professionals to you."}
          </p>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <label className="order-2 block sm:order-1">
          <span className="mb-1 block text-sm font-medium">What do you need?</span>
          <select
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="profession"
            value={profession}
            onChange={(event) => setProfession(event.target.value)}
            required
          >
            {groupedProfessions(professions).map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.items.map((profession) => (
                  <option key={profession.slug} value={profession.slug}>
                    {profession.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="order-3 block sm:order-2">
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
            Where do you need it?
          </label>
          <LocationField
            id={inputId}
            value={location}
            locations={locations}
            onChange={onLocationChange}
            onUseCurrentLocation={useCurrentLocation}
            geoStatus={geoStatus}
          />
        </div>
        <div className="order-1 flex sm:order-3 sm:pt-7">
          <input type="hidden" name="country" value={country} />
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          {isEmergency ? <input type="hidden" name="emergency" value="1" /> : null}
          <button className="btn btn-primary w-full sm:w-auto" type="submit" disabled={pending}>
            {pending ? "Finding…" : "Search nearby"}
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-rust">{error}</p> : null}
    </form>
  );
}
