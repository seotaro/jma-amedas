import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { GeoJsonLayer, SolidPolygonLayer, ScatterplotLayer, ColumnLayer, GridCellLayer } from '@deck.gl/layers';
import { GridLayer, HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import { normalize, mix, hsvToRgb, getAmedasLatestTime, getAmedas } from './utils'

const INITIAL_VIEW_STATE = {
  longitude: 136.0,
  latitude: 35.0,
  zoom: 5,
  maxZoom: 20,
  pitch: 45,
  bearing: 0
};

const settings = {
  'precipitation10m': { name: "10分間降水量", min: 0.0, max: 100.0 },
  'precipitation1h': { name: "1時間降水量", min: 0.0, max: 80.0, colorFunc: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation3h': { name: "3時間降水量", min: 0.0, max: 100.0 },
  'precipitation24h': { name: "24時間降水量", min: 0.0, max: 100.0 },
  'wind': { name: "風向・風速", min: 0.0, max: 100.0 },
  'temp': { name: "気温", min: -10.0, max: 30.0, colorFunc: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'sun1h': { name: "日照時間", min: 0.0, max: 100.0 },
  'snow': { name: "積雪深", min: 0.0, max: 100.0 },
  'snow6h': { name: "6時間降雪量", min: 0.0, max: 100.0 },
  'snow12h': { name: "12時間降雪量", min: 0.0, max: 100.0 },
  'snow24h': { name: "24時間降雪量", min: 0.0, max: 100.0 },
  'humidity': { name: "湿度", min: 0.0, max: 100.0, colorFunc: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
};

function App() {
  const [layer, setLayer] = useState(null);

  useEffect(() => {
    (async () => {
      const latestTime = await getAmedasLatestTime();
      const stations = await getAmedas(latestTime);

      const layer = (function (element) {
        const values = stations.map(x => {
          const normlizedValue = normalize(x[element], settings[element].min, settings[element].max);
          return ({
            code: x.code,
            name: x.name,
            coordinates: x.coordinates,
            normlizedValue: normlizedValue,
            value: x[element],  // tooltip で表示する。
            color: normlizedValue ? settings[element].colorFunc(normlizedValue) : [0, 0, 0, 32],
          })
        });

        return (<GridCellLayer
          id={'gridcelllayer'}
          data={values}
          pickable={true}
          cellSize={5000}
          extruded={true}
          elevationScale={50000}
          getPosition={d => d.coordinates}
          getFillColor={d => d.color}
          getElevation={d => d.normlizedValue}
        />);
      }('temp'));

      setLayer(layer);
    })();
  }, []);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={({ object }) => object && `${object.name}（${object.code}）: ${object.value}`} >

      <SolidPolygonLayer id='background-layer'
        data={[[[-180, 90], [0, 90], [180, 90], [180, -90], [0, -90], [-180, -90]]]}
        getPolygon={d => d}
        filled={true}
        getFillColor={[127, 127, 127]}
      />

      <GeoJsonLayer id="map-layer"
        data={'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_land.geojson'}
        filled={true}
        getFillColor={[64, 64, 64]}
      />

      {layer}

      <MapView id="map" width="100%" controller={true} repeat={true} />
    </DeckGL>
  );
}

export default App;
