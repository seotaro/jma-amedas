import React, { useState, useEffect, Fragment } from 'react';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { theme } from './styles/theme'
import { ThemeProvider, withStyles, makeStyles } from "@material-ui/core/styles";
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import { GeoJsonLayer, SolidPolygonLayer, ScatterplotLayer, ColumnLayer, GridCellLayer } from '@deck.gl/layers';
import { GridLayer, HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import { normalize, mix, hsvToRgb, getAmedasLatestTime, getAmedas } from './utils';
import moment from 'moment';

const INITIAL_VIEW_STATE = {
  longitude: 136.0,
  latitude: 35.0,
  zoom: 5,
  maxZoom: 20,
  pitch: 45,
  bearing: 0
};

const settings = {
  'precipitation10m': { name: "10分間降水量", min: 0.0, max: 40.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation1h': { name: "1時間降水量", min: 0.0, max: 80.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation3h': { name: "3時間降水量", min: 0.0, max: 150.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation24h': { name: "24時間降水量", min: 0.0, max: 300.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'wind': { name: "風向・風速", min: 0.0, max: 25.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'temp': { name: "気温", min: -10.0, max: 30.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'sun1h': { name: "日照時間", min: 0.0, max: 1.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow': { name: "積雪深", min: 0.0, max: 200.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow6h': { name: "6時間降雪量", min: 0.0, max: 50.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow12h': { name: "12時間降雪量", min: 0.0, max: 70.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow24h': { name: "24時間降雪量", min: 0.0, max: 100.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'humidity': { name: "湿度", min: 0.0, max: 100.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
};


const useStyles = makeStyles(() => ({
  title: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 10,
    background: theme.palette.primary.background,
    opacity: theme.palette.primary.opacity,
  },
}));


function App() {
  const classes = useStyles();
  const [element, setElement] = useState('temp');
  const [basetime, setBasetime] = useState(null);
  const [amedas, setAmedas] = useState(null);
  const [layer, setLayer] = useState(null);

  useEffect(() => {
    (async () => {
      const latestTime = await getAmedasLatestTime();
      const amedas = await getAmedas(latestTime);
      setAmedas(amedas);
      setBasetime(latestTime);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!amedas) {
        return;
      }

      const layer = (function (element) {
        if (element === 'wind') {
          // 風向・風速はベクトル表現にする。とりあえず column で大きさだけ表す。
          const values = amedas.map(x => {
            const normlizedValue = x[element] ? normalize(x[element][0], settings[element].min, settings[element].max) : null;
            return ({
              code: x.code,
              name: x.name,
              coordinates: x.coordinates,
              normlizedValue: normlizedValue,
              value: x[element],  // tooltip で表示する。
              color: normlizedValue ? settings[element].colormap(normlizedValue) : [0, 0, 0, 32],
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
        } else {
          const values = amedas.map(x => {
            const normlizedValue = normalize(x[element], settings[element].min, settings[element].max);
            return ({
              code: x.code,
              name: x.name,
              coordinates: x.coordinates,
              normlizedValue: normlizedValue,
              value: x[element],  // tooltip で表示する。
              color: normlizedValue ? settings[element].colormap(normlizedValue) : [0, 0, 0, 32],
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
        }
      }(element));

      setLayer(layer);
    })();
  }, [amedas, element]);

  const items = Object.keys(settings).map(key => <MenuItem key={key} value={key}>{settings[key].name}</MenuItem>);

  return (
    <Fragment>
      <ThemeProvider theme={theme}>
        <Box className={classes.title}>
          <Typography variant="h1" color="primary">JMA AMeDAS</Typography>
          <Box p={0.5}>
            <Typography variant="body1" color="primary">{moment(basetime).format()}</Typography>
          </Box>
          <Box p={0.5}>
            <FormControl >
              <Select
                value={element}
                onChange={e => setElement(e.target.value)} >
                {items}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </ThemeProvider>

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
    </Fragment>
  );
}

export default App;
