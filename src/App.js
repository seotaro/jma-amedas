import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { GeoJsonLayer, SolidPolygonLayer, ScatterplotLayer, ColumnLayer, GridCellLayer } from '@deck.gl/layers';
import { GridLayer, HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';

import fetch from 'node-fetch';
import moment from 'moment';


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

  return (
    <DeckGL
      mapStyle={'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
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
