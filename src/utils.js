
export const normalize = (value, min, max) => ((value - min) / (max - min));
export const mix = (value, min, max) => (min * (1.0 - value) + max * value);

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
