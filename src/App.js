import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { GeoJsonLayer, SolidPolygonLayer, ScatterplotLayer, ColumnLayer, GridCellLayer } from '@deck.gl/layers';
import { GridLayer, HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';

import fetch from 'node-fetch';
import moment from 'moment';

const TABLE_URL = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
const LATEST_TIME_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const DATA_URL = date => `https://www.jma.go.jp/bosai/amedas/data/map/${moment(date).format("YYYYMMDDHHmmss")}.json`;

const INITIAL_VIEW_STATE = {
  longitude: 136.0,
  latitude: 38.0,
  zoom: 5,
  maxZoom: 20,
  pitch: 60,
  bearing: 0
};

function App() {
  const [layer, setLayer] = useState(null);

  useEffect(() => {
    (async () => {
      const latestTime = await fetch(LATEST_TIME_URL)
        .then(response => {
          return response.text();
        })
        .then(text => {
          return new Date(text);
        })
        .catch((error) => {
          console.error(error)
        });

      const urls = [TABLE_URL, DATA_URL(latestTime)];
      const [table, data] = await Promise.all(urls.map((url) => {
        return fetch(url)
          .then(response => {
            return response.text();
          })
          .then(text => {
            return JSON.parse(text);
          })
          .catch((error) => {
            console.error(error)
          })
      }))

      const stations = Object.keys(data).map(k => {
        const t = table[k];
        const d = data[k];
        const station = {
          code: k,
          name: t.kjName,
          coordinates: [t.lon[0] + t.lon[1] / 60.0, t.lat[0] + t.lat[1] / 60.0],
          precipitation10m: d.precipitation10m && (d.precipitation10m[1] === 0) ? d.precipitation10m[0] : null,
          precipitation1h: d.precipitation1h && (d.precipitation1h[1] === 0) ? d.precipitation1h[0] : null,
          precipitation3h: d.precipitation3h && (d.precipitation3h[1] === 0) ? d.precipitation3h[0] : null,
          precipitation24h: d.precipitation24h && (d.precipitation24h[1] === 0) ? d.precipitation24h[0] : null,
          wind: d.wind && d.windDirection && (d.wind[1] === 0) && (d.windDirection[1] === 0) ? [d.wind[0], d.windDirection[0]] : null,
          temp: d.temp && (d.temp[1] === 0) ? d.temp[0] : null,
          sun1h: d.sun1h && (d.sun1h[1] === 0) ? d.sun1h[0] : null,
          snow: d.snow && (d.snow[1] === 0) ? d.snow[0] : null,
          snow6h: d.snow6h && (d.snow6h[1] === 0) ? d.snow6h[0] : null,
          snow12h: d.snow12h && (d.snow12h[1] === 0) ? d.snow12h[0] : null,
          snow24h: d.snow24h && (d.snow24h[1] === 0) ? d.snow24h[0] : null,
          humidity: d.humidity && (d.humidity[1] === 0) ? d.humidity[0] : null,
        };
        return station;
      }
      );

      const layer = (function (element) {
        return (<GridCellLayer
          id={'gridcelllayer'}
          data={stations}
          pickable={true}
          cellSize={5000}
          extruded={true}
          elevationScale={1000}
          getPosition={d => d.coordinates}
          getFillColor={d => d[element] ? [48, 128, 255, 255] : [0, 0, 0, 32]}
          getElevation={d => d[element] ? d[element] : 0}
        />);
      }('humidity'));

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
