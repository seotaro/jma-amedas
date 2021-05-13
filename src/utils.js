import fetch from 'node-fetch';
import moment from 'moment';

const TABLE_URL = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
const LATEST_TIME_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const DATA_URL = date => `https://www.jma.go.jp/bosai/amedas/data/map/${moment(date).format("YYYYMMDDHHmmss")}.json`;

export const normalize = (value, min, max) => (value === null) ? null : ((value - min) / (max - min));
export const mix = (value, min, max) => (value === null) ? null : (min * (1.0 - value) + max * value);

export function hsvToRgb(H, S, V) {
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

export async function getAmedasLatestTime() {
    return fetch(LATEST_TIME_URL)
        .then(response => {
            return response.text();
        })
        .then(text => {
            return new Date(text);
        })
        .catch((error) => {
            console.error(error)
        });
}

export async function getAmedas(date) {
    const urls = [TABLE_URL, DATA_URL(date)];
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

    return Object.keys(data).map(k => {
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
            wind: d.wind && d.windDirection && (d.wind[1] === 0) && (d.windDirection[1] === 0) ? [d.wind[0], d.windDirection[0] * 360.0 / 16.0] : null,    // 16方位は角度［°］に変換する。
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
}