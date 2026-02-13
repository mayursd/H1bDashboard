export type WageRecord = {
  county_fips: string;
  county_name: string;
  state: string;
  job_title: string;
  level_1: number;
  level_2: number;
  level_3: number;
  level_4: number;
  source_count: number;
};

export type WageMap = Record<string, WageRecord>;

export type CountyFeature = GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, { GEOID: string; NAME: string; STATE: string }>;
