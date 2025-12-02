import { Actor } from 'apify'
import { CheerioCrawler, log } from 'crawlee'

import { getApartmentsListSearchRequest } from './urls/urls.js'
import { router } from './routes.js'
import { POSTAL_CODES } from './constants/postal-codes/index.js'
import { PREFECTURES } from './constants/prefectures.js'

await Actor.init()

const TOKYO_PREFECTURE = PREFECTURES.find(
  (prefecture) => prefecture.id === 'tokyo'
)
const SHIBUYA_POSTAL_CODE = POSTAL_CODES.find(
  (postalCode) => postalCode.name.en === 'Shibuya Ward'
)

const searchRequest = getApartmentsListSearchRequest({
  prefecture: TOKYO_PREFECTURE!.id,
  postalCodes: [SHIBUYA_POSTAL_CODE!.code],
})

const formData = new URLSearchParams()
for (const [key, value] of Object.entries(searchRequest.payload)) {
  if (Array.isArray(value)) {
    for (const item of value) {
      formData.append(`${key}[]`, item)
    }
  } else {
    formData.append(key, value)
  }
}

const startUrls = [
  {
    url: searchRequest.url,
    method: searchRequest.method as 'POST',
    headers: searchRequest.headers,
    payload: formData.toString(),
    label: 'listing',
    useExtendedUniqueKey: true,
  },
]

log.info('Starting scraper for Shibuya Ward', { url: searchRequest.url })

const crawler = new CheerioCrawler({
  requestHandler: router,
})

await crawler.run(startUrls)

log.info('Scraper finished')

await Actor.exit()
