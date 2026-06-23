// 全局主题：颜色、间距、圆角、字号
// 设计风格：月庭雅韵 —— 深色夜色 + 琥珀金主调
export const colors = {
  // 背景层级
  bgDeep: '#0B1426',         // 最底层（页面背景）
  bgBase: '#16213E',         // 中层
  bgCard: '#0F3460',         // 卡片背景
  bgElev: '#1A2A4F',         // 浮起元素

  // 主调
  gold: '#D4A574',           // 琥珀金（主色）
  goldBright: '#F4D03F',     // 高亮金
  goldDeep: '#A67C52',       // 暗金

  // 语义色
  success: '#2ECC71',
  danger: '#C73E1D',
  warn: '#E67E22',
  info: '#5DADE2',

  // 文字
  textPrimary: '#F5F5F5',
  textSecondary: '#C9C9D6',
  textMuted: '#8A8FA3',
  textOnGold: '#1A1A2E',

  // 棋盘
  boardDark: '#2C1810',      // 深色木质
  boardEdge: '#1A0F08',
  gridLine: '#8A7B66',
  starDot: '#D4A574',

  // 棋子
  stoneBlack: '#0A0A0A',
  stoneBlackHi: '#2A2A2A',
  stoneWhite: '#F2EAD3',
  stoneWhiteEdge: '#5C4A2A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const fontSize = {
  tiny: 11,
  small: 13,
  body: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

const theme = { colors, spacing, radius, fontSize, fontWeight };
export default theme;
