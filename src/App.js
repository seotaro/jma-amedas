import React, { useState, useEffect, Fragment } from 'react';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { theme } from './styles/theme'
import { ThemeProvider, makeStyles } from "@material-ui/core/styles";
import DeckGL from '@deck.gl/react';
import { MapView, _GlobeView as GlobeView } from '@deck.gl/core';
import { GeoJsonLayer, SolidPolygonLayer, ScatterplotLayer, ColumnLayer, GridCellLayer, IconLayer } from '@deck.gl/layers';
import { normalize, mix, hsvToRgb, getAmedasLatestTime, getAmedas, useQuery } from './utils';
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
  'precipitation10m': { name: "10分間降水量", unit: 'mm', min: 0.0, max: 40.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation1h': { name: "1時間降水量", unit: 'mm', min: 0.0, max: 80.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation3h': { name: "3時間降水量", unit: 'mm', min: 0.0, max: 150.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'precipitation24h': { name: "24時間降水量", unit: 'mm', min: 0.0, max: 300.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'wind': { name: "風向・風速", unit: ['m/s', '°'], min: 0.0, max: 25.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'temp': { name: "気温", unit: '℃', min: -10.0, max: 30.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'sun1h': { name: "日照時間", unit: '時間', min: 0.0, max: 1.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow': { name: "積雪深", unit: 'cm', min: 0.0, max: 200.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow6h': { name: "6時間降雪量", unit: 'cm', min: 0.0, max: 50.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow12h': { name: "12時間降雪量", unit: 'cm', min: 0.0, max: 70.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'snow24h': { name: "24時間降雪量", unit: 'cm', min: 0.0, max: 100.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
  'humidity': { name: "湿度", unit: '%', min: 0.0, max: 100.0, colormap: ((value) => hsvToRgb(mix(value, 240.0, 0.0), 1.0, 1.0)) },
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
  const [layerType, setLayerType] = useState('column');
  const [basetime, setBasetime] = useState(null);
  const [amedas, setAmedas] = useState(null);
  const [layer, setLayer] = useState(null);

  const query = useQuery();
  const viewType = query.get('viewType') || 'MapView';

  useEffect(() => {
    (async () => {
      const latestTime = await getAmedasLatestTime();
      const amedas = await getAmedas(latestTime);
      setAmedas(amedas);
      setBasetime(latestTime);
    })();
  }, []);

  useEffect(() => {
    switch (element) {
      case 'wind':
        if (layerType !== 'icon') {
          setLayerType('icon');
        }
        break;

      default:
        if (layerType === 'icon') {
          setLayerType('column');
        }
        break;
    }
  }, [element]);

  useEffect(() => {
    (async () => {
      if (!amedas) {
        return;
      }

      const size = 2500;
      const layer = (function (element) {
        if (element === 'wind') {
          // 風向・風速はベクトル表現にする。とりあえず column で大きさだけ表す。
          const values = amedas.map(x => {
            const normlizedValue = x[element]
              ? [normalize(x[element][0], settings[element].min, settings[element].max), x[element][1]]
              : null;

            return ({
              code: x.code,
              name: x.name,
              coordinates: x.coordinates,
              normlizedValue: normlizedValue,
              value: x[element],  // tooltip で表示する。
              color: (normlizedValue === null) ? [0, 0, 0, 32] : settings[element].colormap(normlizedValue[0]),
              icon: ((normlizedValue === null) || (normlizedValue[1] == 0.0)) ? 'dot' : 'arrow',
              angle: (normlizedValue === null) ? 0.0 : (180.0 - normlizedValue[1]),
            })
          });

          return (< IconLayer id='iconlayer'
            data={values}
            pickable={true}
            iconAtlas={'wind-icon.png'}
            iconMapping={'wind-icon.json'}
            getIcon={d => d.icon}
            getColor={d => d.color}
            getPosition={d => d.coordinates}
            billboard={false}
            sizeUnits={'meters'}
            sizeScale={10}
            getSize={d => size}
            getAngle={d => d.angle}
          />);

        } else {
          // 風以外のスカラー値

          const values = amedas.map(x => {
            const normlizedValue = (x[element] === null)
              ? null
              : normalize(x[element], settings[element].min, settings[element].max);

            return ({
              code: x.code,
              name: x.name,
              coordinates: x.coordinates,
              normlizedValue: normlizedValue,
              value: x[element],  // tooltip で表示する。
              color: (normlizedValue === null) ? [0, 0, 0, 32] : settings[element].colormap(normlizedValue),
            })
          });

          switch (layerType) {
            case 'gridcell':
              return (<GridCellLayer
                id={'gridcelllayer'}
                data={values}
                pickable={true}
                cellSize={size * 2}
                extruded={true}
                elevationScale={50000}
                getPosition={d => d.coordinates}  // セルの中心ではなく bottom-left であることに注意。
                getFillColor={d => d.color}
                getElevation={d => d.normlizedValue}
              />);

            case 'column':
              return (<ColumnLayer
                id={'columnlayer'}
                data={values}
                pickable={true}
                diskResolution={20}
                radius={size}
                extruded={true}
                elevationScale={50000}
                getPosition={d => d.coordinates}
                getFillColor={d => d.color}
                getElevation={d => d.normlizedValue}
              />);

            case 'scatterplot':
              return (<ScatterplotLayer
                id={'scatterplotlayer'}
                data={values}
                pickable={true}
                opacity={0.8}
                filled={true}
                radiusScale={size}
                lineWidthMinPixels={1}
                getPosition={d => d.coordinates}
                getRadius={d => d.normlizedValue}
                getFillColor={d => d.color}
              />);
          }
        }
      }(element));

      setLayer(layer);
    })();
  }, [amedas, element, layerType]);

  const elementItems = Object.keys(settings).map(key => <MenuItem key={key} value={key}>{settings[key].name}</MenuItem>);

  const layetTypes = {
    'column': { disabled: (element === 'wind') ? true : false },
    'gridcell': { disabled: (element === 'wind') ? true : false },
    'scatterplot': { disabled: (element === 'wind') ? true : false },
    'icon': { disabled: (element === 'wind') ? false : true }
  };
  const layerTypeItems = Object.keys(layetTypes).map(key => <MenuItem key={key} value={key} disabled={layetTypes[key].disabled}>{key}</MenuItem>);

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
                {elementItems}
              </Select>
            </FormControl>
          </Box>
          <Box p={0.5}>
            <FormControl >
              <Select
                value={layerType}
                onChange={e => setLayerType(e.target.value)} >
                {layerTypeItems}
              </Select>
            </FormControl>
          </Box>
          <Box p={0.5}>
            <FormControl >
              <Select
                value={viewType}
                onChange={e => { window.location.href = `?viewType=${e.target.value}` }} >
                {[
                  <MenuItem key={'MapView'} value={'MapView'} >MapView</MenuItem>,
                  <MenuItem key={'GlobeView'} value={'GlobeView'} >GlobeView</MenuItem>
                ]}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </ThemeProvider>

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={
          ({ object }) => object && `${object.name}（${object.code}）: ` +
            (
              (object.value === null) ? null : (
                (element === 'wind')
                  ? `${object.value[0]} [${settings[element].unit[0]}], ${object.value[1]} [${settings[element].unit[1]}]`
                  : `${object.value} [${settings[element].unit}]`
              )
            )
        } >

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

        {
          viewType === 'GlobeView'
            ? <GlobeView id="map" width="100%" controller={true} resolution={1} />
            : <MapView id="map" width="100%" controller={true} repeat={true} />
        }
      </DeckGL>
    </Fragment >
  );
}

export default App;
