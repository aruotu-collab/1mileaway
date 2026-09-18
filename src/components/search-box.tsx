"use client";

import { useState } from "react";
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
  showUrgencyTabs = false,
  professions = [],
  locations = [],
}: {
  country?: string;
  defaultProfession?: string;
  defaultLocation?: string;
  emergency?: boolean;
  showUrgencyTabs?: boolean;
  professions?: ProfessionChoice[];
  locations?: LocationChoice[];
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
    setGeoStatus(null);
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
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">What do you need?</span>
          <select
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="profession"
            defaultValue={
              professions.find((profession) => profession.slug === defaultProfession)?.slug ??
              professions[0]?.slug ??
              "plumbers"
            }
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
        <div className="block">
          <label htmlFor="where-needed" className="mb-1 block text-sm font-medium">
            Where do you need it?
          </label>
          <LocationField
            id="where-needed"
            value={location}
            locations={locations}
            onChange={onLocationChange}
            onUseCurrentLocation={useCurrentLocation}
            geoStatus={geoStatus}
          />
        </div>
        <div className="flex sm:pt-7">
          <input type="hidden" name="country" value={country} />
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          {isEmergency ? <input type="hidden" name="emergency" value="1" /> : null}
          <button className="btn btn-primary w-full sm:w-auto" type="submit">
            Search nearby
          </button>
        </div>
      </div>
    </form>
  );
}
