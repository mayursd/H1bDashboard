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

const format = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function WageMap({ geojson, selectedJobTitle, baseSalary, wagesByKey, onCountySelect }: Props) {
  return (
    <MapContainer center={[37.8, -96]} zoom={4} minZoom={3} className="h-full w-full">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      <MapClickReset onCountySelect={onCountySelect} />
      <GeoJSON
        data={geojson as FeatureCollection<Geometry>}
        style={(feature) => {
          const fips = feature?.properties?.GEOID as string;
          const rec = wagesByKey[`${fips}_${selectedJobTitle}`];
          return {
            color: "#0f172a",
            weight: 0.4,
            fillOpacity: 0.78,
            fillColor: getBandColor(getBand(baseSalary, rec)),
          };
        }}
        onEachFeature={(feature: Feature, layer) => {
          const fips = feature.properties?.GEOID as string;
          const rec = wagesByKey[`${fips}_${selectedJobTitle}`];
          const tooltip = rec
            ? `${rec.county_name}, ${rec.state}\nL1: $${format(rec.level_1)}\nL2: $${format(rec.level_2)}\nL3: $${format(rec.level_3)}\nL4: $${format(rec.level_4)}`
            : `${feature.properties?.NAME}\nNo wage data for ${selectedJobTitle}`;

          layer.bindTooltip(tooltip);
          layer.on({
            click: () => onCountySelect(fips),
            mouseover: () => layer.setStyle({ weight: 1.2 }),
            mouseout: () => layer.setStyle({ weight: 0.4 }),
          });
        }}
      />
    </MapContainer>
  );
}
