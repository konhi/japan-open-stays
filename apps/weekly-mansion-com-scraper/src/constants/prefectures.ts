export const PREFECTURES = [
  {
    id: 'aichi',
  },
  {
    id: 'akita',
  },
  {
    id: 'aomori',
  },
  {
    id: 'chiba',
  },
  {
    id: 'ehime',
  },
  {
    id: 'fukui',
  },
  {
    id: 'fukuoka',
  },
  {
    id: 'fukushima',
  },
  {
    id: 'gifu',
  },
  {
    id: 'gumma',
  },
  {
    id: 'hiroshima',
  },
  {
    id: 'hokkaido',
  },
  {
    id: 'hyogo',
  },
  {
    id: 'ibaraki',
  },
  {
    id: 'ishikawa',
  },
  {
    id: 'iwate',
  },
  {
    id: 'kagawa',
  },
  {
    id: 'kagoshima',
  },
  {
    id: 'kanagawa',
  },
  {
    id: 'kochi',
  },
  {
    id: 'kumamoto',
  },
  {
    id: 'kyoto',
  },
  {
    id: 'mie',
  },
  {
    id: 'miyagi',
  },
  {
    id: 'miyazaki',
  },
  {
    id: 'nagano',
  },
  {
    id: 'nagasaki',
  },
  {
    id: 'nara',
  },
  {
    id: 'niigata',
  },
  {
    id: 'oita',
  },
  {
    id: 'okayama',
  },
  {
    id: 'okinawa',
  },
  {
    id: 'osaka',
  },
  {
    id: 'saga',
  },
  {
    id: 'saitama',
  },
  {
    id: 'shiga',
  },
  {
    id: 'shimane',
  },
  {
    id: 'shizuoka',
  },
  {
    id: 'tochigi',
  },
  {
    id: 'tokushima',
  },
  {
    id: 'tokyo',
  },
  {
    id: 'tottori',
  },
  {
    id: 'toyama',
  },
  {
    id: 'wakayama',
  },
  {
    id: 'yamagata',
  },
  {
    id: 'yamaguchi',
  },
  {
    id: 'yamanashi',
  },
] as const

export const ENABLED_PREFECTURES = ['saitama'] satisfies (typeof PREFECTURES)[number]['id'][]