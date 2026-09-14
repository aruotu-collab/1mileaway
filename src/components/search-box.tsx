"use client";

import { useState } from "react";
import { goToMarketplace, labelForCoordinates } from "@/app/actions/search";
import { UrgencyTabs } from "@/components/urgency-tabs";

export function SearchBox({
  country = "gb",
  defaultProfession = "plumbers",
  defaultLocation = "",
  emergency = false,
  showUrgencyTabs = false,
}: {
  country?: string;
  defaultProfession?: string;
  defaultLocation?: string;
  emergency?: boolean;
  showUrgencyTabs?: boolean;
}) {
  const [location, setLocation] = useState(defaultLocation);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(emergency);

  function onLocationChange(value: string) {
    setLocation(value);
    setLat("");
    setLng("");
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
      },
      () => {
        setGeoStatus("Location permission was denied. Type a postcode or address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={goToMarketplace} className="card grid gap-3 p-4">
      {showUrgencyTabs ? (
        <UrgencyTabs emergency={isEmergency} onChange={setIsEmergency} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">What do you need?</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="profession"
            defaultValue={defaultProfession}
            placeholder="Plumber, locksmith…"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Where do you need it?</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="location"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Postcode, area or full address"
            autoComplete="street-address"
          />
        </label>
        <div className="flex items-end">
          <input type="hidden" name="country" value={country} />
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          {isEmergency ? <input type="hidden" name="emergency" value="1" /> : null}
          <button className="btn btn-primary w-full sm:w-auto" type="submit">
            Search nearby
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          className="font-medium text-moss-deep underline-offset-2 hover:underline"
          onClick={useCurrentLocation}
        >
          Use my current location
        </button>
        {geoStatus ? <span className="text-ink-soft">{geoStatus}</span> : (
          <span className="text-ink-soft">Or type a postcode such as SE6 4AA, or a street address.</span>
        )}
      </div>
    </form>
  );
}
