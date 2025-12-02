import { POSTAL_CODES_SAITAMA } from './saitama.js'
import { POSTAL_CODES_TOKYO } from './tokyo.js'

export const POSTAL_CODES = [
  ...POSTAL_CODES_TOKYO,
  ...POSTAL_CODES_SAITAMA,
] as const
