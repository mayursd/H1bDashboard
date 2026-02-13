"use client";

import { GeoJSON, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { getBand, getBandColor } from "@/lib/wageLogic";
import { WageMap } from "@/lib/types";

type Props = {
  geojson: FeatureCollection;
  selectedJobTitle: string;
  baseSalary: number;
  wagesByKey: WageMap;
  onCountySelect: (fips: string | null) => void;
};

function MapClickReset({ onCountySelect }: { onCountySelect: (fips: string | null) => void }) {
  useMapEvents({ click: () => onCountySelect(null) });
  return null;
}

export default function WageMap({ geojson, selectedJobTitle, baseSalary, wagesByKey, onCountySelect }: Props) {
  return (
    <MapContainer center={[37.8, -96]} zoom={4} minZoom={3} className="h-full w-full rounded-xl">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      <MapClickReset onCountySelect={onCountySelect} />
      <GeoJSON
        data={geojson as FeatureCollection<Geometry>}
        style={(feature) => {
          const fips = feature?.properties?.GEOID as string;
          const rec = wagesByKey[`${fips}_${selectedJobTitle}`];
          return {
            color: "#fff",
            weight: 0.25,
            fillOpacity: 0.75,
            fillColor: getBandColor(getBand(baseSalary, rec)),
          };
        }}
        onEachFeature={(feature: Feature, layer) => {
          const fips = feature.properties?.GEOID as string;
          const rec = wagesByKey[`${fips}_${selectedJobTitle}`];
          const tooltip = rec
            ? `${rec.county_name}, ${rec.state}\nL1: $${rec.level_1.toLocaleString()}\nL2: $${rec.level_2.toLocaleString()}\nL3: $${rec.level_3.toLocaleString()}\nL4: $${rec.level_4.toLocaleString()}`
            : `${feature.properties?.NAME}\nNo wage data for ${selectedJobTitle}`;

          layer.bindTooltip(tooltip);
          layer.on({
            click: () => onCountySelect(fips),
            mouseover: () => layer.setStyle({ weight: 1 }),
            mouseout: () => layer.setStyle({ weight: 0.25 }),
          });
        }}
      />
    </MapContainer>
  );
}
