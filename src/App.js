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

const normalize = (value, min, max) => ((value - min) / (max - min));
const mix = (value, min, max) => (min * (1.0 - value) + max * value);

function hsvToRgb(H, S, V) {
  if (360.0 <= H) {
    H = 0.0;
  }

  const Hi = Math.floor(H / 60.0) % 6;
  const f = H / 60.0 - Hi;

  const p = V * (1.0 - S);
  const q = V * (1.0 - S * f);
  const t = V * (1.0 - S * (1.0 - f));

  let rgb = [0.0, 0.0, 0.0]; // 0.0 〜 1.0
  switch (Hi) {
    case 0: rgb = [V, t, p]; break;
    case 1: rgb = [q, V, p]; break;
    case 2: rgb = [p, V, t]; break;
    case 3: rgb = [p, q, V]; break;
    case 4: rgb = [t, p, V]; break;
    case 5: rgb = [V, p, q]; break;
  }

  return rgb.map(x => Math.floor(x * 255)); // 0 〜 255
}


const settings = {
  'precipitation10m': { name: "10分間降水量", min: 0.0, max: 100.0, offset: 0.0 },
  'precipitation1h': { name: "1時間降水量", min: 0.0, max: 100.0, offset: 0.0 },
  'precipitation3h': { name: "3時間降水量", min: 0.0, max: 100.0, offset: 0.0 },
  'precipitation24h': { name: "24時間降水量", min: 0.0, max: 100.0, offset: 0.0 },
  'wind': { name: "風向・風速", min: 0.0, max: 100.0, offset: 0.0 },
  'temp': { name: "気温", min: -10.0, max: 30.0, offset: 0.0, colorFunc: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'sun1h': { name: "日照時間", min: 0.0, max: 100.0, offset: 0.0 },
  'snow': { name: "積雪深", min: 0.0, max: 100.0, offset: 0.0 },
  'snow6h': { name: "6時間降雪量", min: 0.0, max: 100.0, offset: 0.0 },
  'snow12h': { name: "12時間降雪量", min: 0.0, max: 100.0, offset: 0.0 },
  'snow24h': { name: "24時間降雪量", min: 0.0, max: 100.0, offset: 0.0 },
  'humidity': { name: "湿度", min: 0.0, max: 100.0, offset: 0.0, colorFunc: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
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
      });

      const layer = (function (element) {
        const values = stations.map(x => {
          const normlizedValue = x[element] ? normalize(x[element], settings[element].min, settings[element].max) : 0.0;
          return ({
            code: x.code,
            name: x.name,
            coordinates: x.coordinates,
            normlizedValue: normlizedValue,
            value: x[element],  // tooltip で出力する。
            color: x[element] ? settings[element].colorFunc(normlizedValue) : [0, 0, 0, 32],
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
