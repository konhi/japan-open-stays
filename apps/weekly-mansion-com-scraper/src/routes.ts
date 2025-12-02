import { createCheerioRouter } from 'crawlee'

import { BASE_URL } from './urls/urls.js'

export const router = createCheerioRouter()

interface PricingPeriod {
  periodName: string
  periodRange: string
  rentPerDay: string | null
  rentPerMonth: string | null
  utilitiesPerDay: string | null
  utilitiesPerMonth: string | null
  cleaningFee: string | null
}

interface PropertyListing {
  id: string
  title: string
  detailUrl: string
  images: string[]
  address: string | null
  nearestStation: string | null
  additionalTransport: string | null
  layout: string | null
  area: string | null
  builtDate: string | null
  amenities: { name: string; available: boolean }[]
  pricing: PricingPeriod[]
  company: {
    name: string | null
    url: string | null
    phone: string | null
  }
}

router.addHandler('listing', async ({ request, $, log, pushData }) => {
  log.info('Processing listing page', { url: request.loadedUrl })

  const listings: PropertyListing[] = []

  $('.listArea .box.linkBoxMultiple').each((_index, element) => {
    const $box = $(element)

    const titleLink = $box.find('.titleArea h4 a').first()
    const title = titleLink.text().trim()
    const detailHref = titleLink.attr('href') ?? ''
    const idMatch = detailHref.match(/bukken_no=(\d+)/)
    const id = idMatch?.[1] ?? ''

    const images: string[] = []
    $box.find('.detailPhotoArea .slide ul li img').each((_i, img) => {
      const src = $(img).attr('src')
      if (src) {
        images.push(src.startsWith('http') ? src : `${BASE_URL}${src}`)
      }
    })

    let address: string | null = null
    let nearestStation: string | null = null
    let additionalTransport: string | null = null
    let layout: string | null = null
    let area: string | null = null
    let builtDate: string | null = null

    $box.find('.detailInner dl').each((_i, dl) => {
      const $dl = $(dl)
      const dt = $dl.find('dt').text().trim()
      const dd = $dl.find('dd').clone()
      dd.find('.toolTipLink, .toolTip01').remove()
      const ddText = dd.text().trim().replace(/\s+/g, ' ')

      const tooltipText = $dl
        .find('.toolTip01')
        .text()
        .trim()
        .replace(/\s+/g, ' ')

      switch (dt) {
        case '所在地':
          address = ddText
          break
        case '最寄駅':
          nearestStation = ddText
          if (tooltipText) {
            additionalTransport = tooltipText
          }
          break
        case '間取り':
          layout = ddText
          break
        case '面積':
          area = ddText
          break
        case '築年月':
          builtDate = ddText
          break
      }
    })

    const amenities: { name: string; available: boolean }[] = []
    $box.find('.iconArea ul li').each((_i, li) => {
      const $li = $(li)
      const name = $li.text().trim()
      const available = $li.hasClass('on')
      if (name) {
        amenities.push({ name, available })
      }
    })

    const pricing: PricingPeriod[] = []
    $box.find('.price table tr.style02').each((_i, tr) => {
      const $tr = $(tr)
      const thElement = $tr.find('th')
      const periodName = thElement
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim()
      const periodRange = thElement.find('span').text().trim()
      const cells = $tr.find('td')

      const rentHtml = cells.eq(0).html() ?? ''
      const utilitiesHtml = cells.eq(1).html() ?? ''
      const cleaningText = cells.eq(2).text().trim()

      const parseCell = (html: string): string[] => {
        const withNewlines = html.replace(/<br\s*\/?>/gi, '\n')
        const decoded = $('<div>').html(withNewlines).text()
        return decoded
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      }

      const rentParts = parseCell(rentHtml)
      const utilitiesParts = parseCell(utilitiesHtml)

      pricing.push({
        periodName,
        periodRange,
        rentPerDay: rentParts[0] || null,
        rentPerMonth: rentParts[1] || null,
        utilitiesPerDay: utilitiesParts[0] || null,
        utilitiesPerMonth: utilitiesParts[1] || null,
        cleaningFee: cleaningText || null,
      })
    })

    const companyLink = $box.find('.company dl.layout01 dd a')
    const companyName = companyLink.text().trim() || null
    const companyHref = companyLink.attr('href')
    const companyUrl = companyHref
      ? companyHref.startsWith('http')
        ? companyHref
        : `${BASE_URL}${companyHref}`
      : null
    const companyPhone =
      $box.find('.company dl.layout02 dd').text().trim() || null

    const listing: PropertyListing = {
      id,
      title,
      detailUrl: detailHref.startsWith('http')
        ? detailHref
        : `${BASE_URL}${detailHref}`,
      images,
      address,
      nearestStation,
      additionalTransport,
      layout,
      area,
      builtDate,
      amenities,
      pricing,
      company: {
        name: companyName,
        url: companyUrl,
        phone: companyPhone,
      },
    }

    listings.push(listing)
  })

  log.info(`Found ${listings.length} listings`)

  for (const listing of listings) {
    await pushData(listing)
  }
})
