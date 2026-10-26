import names from 'color-name';
export function resolveColor(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const key = trimmed.toLowerCase().replace(/[ -]/g, '');
  let rgb = Object.hasOwn(names, key) ? names[key] : null;
  if (!rgb && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    const hex = trimmed.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    rgb = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
  }
  if (!rgb) return null;
  const luminance = rgb
    .map((channel) => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return {
    background: `rgb(${rgb.join(', ')})`,
    foreground: luminance > 0.179 ? '#111111' : '#ffffff',
  };
}
