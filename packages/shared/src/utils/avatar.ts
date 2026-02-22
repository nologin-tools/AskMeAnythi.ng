/**
 * 基于字符串生成确定性哈希
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 从哈希值生成伪随机数
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * 生成 HSL 颜色
 */
function generateColor(random: () => number): string {
  const hue = Math.floor(random() * 360);
  const saturation = 60 + Math.floor(random() * 20); // 60-80%
  const lightness = 45 + Math.floor(random() * 15); // 45-60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * 生成对比色（背景色）
 */
function generateBackgroundColor(random: () => number): string {
  const hue = Math.floor(random() * 360);
  const saturation = 20 + Math.floor(random() * 20); // 20-40%
  const lightness = 85 + Math.floor(random() * 10); // 85-95%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * 生成 5x5 对称图案的 Hash Avatar SVG
 * @param seed 用于生成的种子字符串（通常是 visitor_id）
 * @param size SVG 尺寸（像素）
 */
export function generateHashAvatar(seed: string, size: number = 40): string {
  const hash = hashString(seed);
  const random = seededRandom(hash);

  const foregroundColor = generateColor(random);
  const backgroundColor = generateBackgroundColor(random);

  // 生成 5x5 图案（只需生成左侧 3 列，右侧对称）
  const pattern: boolean[][] = [];
  for (let y = 0; y < 5; y++) {
    pattern[y] = [];
    for (let x = 0; x < 3; x++) {
      pattern[y][x] = random() > 0.5;
    }
    // 对称填充
    pattern[y][3] = pattern[y][1];
    pattern[y][4] = pattern[y][0];
  }

  // 生成 SVG 路径
  const cellSize = size / 5;
  let rects = '';

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (pattern[y][x]) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${foregroundColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
    ${rects}
  </svg>`;
}

/**
 * 生成 Hash Avatar 的 Data URL
 */
export function generateHashAvatarDataUrl(seed: string, size: number = 40): string {
  const svg = generateHashAvatar(seed, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
