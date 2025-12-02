import { POSTAL_CODES } from '../constants/postal-codes/index.js'
import { PREFECTURES } from '../constants/prefectures.js'

export const BASE_URL = 'https://www.weekly-mansion.com'

export const getApartmentsListSearchRequest = ({
  prefecture,
  postalCodes,
}: {
  prefecture: (typeof PREFECTURES)[number]['id']
  postalCodes: (typeof POSTAL_CODES)[number]['code'][]
}) => {
  return {
    url: `${BASE_URL}/${prefecture}/search/list_add.html`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    payload: {
      // AI: Display/pagination settings
      disp_count_upper: '10000',
      sort: '',
      disp_count_under: '10',
      this_page_no: '1',
      cmd: 'COUNT',
      disp_count: '10000',
      hidden_sort: '',
      random_number: String(Math.floor(Math.random() * 1000)),

      // AI: Rent filters
      web_yachin_int_ss_to: '',
      web_yachin_int_s_month_to: '',
      hidden_web_yachin_int_ss_from: '1',
      hidden_web_yachin_int_ss_to: '',
      hidden_web_yachin_int_s_month_from: '1',
      hidden_web_yachin_int_s_month_to: '',

      // AI: Stay period filter
      priod_time_to_short: '',
      hidden_priod_time_to_short: '',

      // AI: Occupancy filter
      web_nyukyo_ninzu: '',
      hidden_web_nyukyo_ninzu: '',

      // AI: Walking distance filter
      walk: '',
      hidden_walk: '',

      // AI: Room size filters
      good_web_hirosa_from: '',
      good_web_hirosa_to: '',
      hidden_good_web_hirosa_from: '',
      hidden_good_web_hirosa_to: '',

      // AI: Building age filter
      chiku_ym: '',
      hidden_chiku_ym: '',

      // AI: Bed type filters
      hidden_new_web_bed_type1: '',
      hidden_new_web_bed_type2: '',
      hidden_new_web_bed_type3: '',
      hidden_new_web_bed_type4: '',

      // AI: Room layout (madori) filters
      hidden_good_web_madori_1R: '',
      hidden_good_web_madori_1K: '',
      hidden_good_web_madori_1DK: '',
      hidden_good_web_madori_1LDK: '',
      hidden_good_web_madori_2K: '',
      hidden_good_web_madori_2DK: '',
      hidden_good_web_madori_2LDK: '',

      // AI: General conditions
      hidden_jyouken1: '',
      hidden_jyouken4: '',
      hidden_jyouken6: '',
      hidden_jyouken10: '',
      hidden_jyouken12: '',
      hidden_jyouken16: '',
      hidden_jyouken17: '',

      // AI: Equipment/amenity filters
      hidden_setsubi_autoLock: '',
      hidden_setsubi_air_conditioner: '',
      hidden_setsubi_tv: '',
      hidden_setsubi_microwave_oven: '',
      hidden_setsubi_icebox: '',
      hidden_setsubi_closet: '',
      hidden_setsubi_bath_toilet_separate: '',
      hidden_setsubi_washroom_separate: '',
      hidden_setsubi_flooring: '',
      hidden_setsubi_washing_machine: '',
      hidden_setsubi_vacuum_cleaner: '',
      hidden_setsubi_delivery_to_home_box: '',
      hidden_setsubi_ih_cooking_heater: '',
      hidden_setsubi_gas_conlo: '',
      hidden_setsubi_addition_heat: '',
      hidden_setsubi_bathroom_dryer: '',
      hidden_setsubi_wash_toilet: '',
      hidden_setsubi_elevator: '',

      // AI: Guarantor and payment filters
      hidden_hoshounin_flag: '',
      hidden_web_pay3: '',

      // AI: Postal code list (dynamic)
      jyuusyo_cd_list: postalCodes,
    },
  }
}
