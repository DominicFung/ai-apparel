import axios from 'axios'
import FormData from 'form-data'

//https://images.printify.com/storage/anonymous
export interface PrintifyImageUploadResponse {
  id: string
  uri: string
  fullSizeUri: string
  svgUri: null
  width: number
  height: number
  mimetype: "image/png"
  sourceMimeType: "image/png"
  fileName: string
  archived: boolean
  size: number
  uploadTime: string
  isShutterstock: boolean
  enhancedImage: { status:string, data: any }
}

export interface CookieShape {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  size: number
  httpOnly: boolean
  secure: boolean
  session: boolean
  sameParty: boolean
  sourceScheme: string
  sourcePort: number
}

export const testUpload = async (s: ReadableStream, cookies: CookieShape[]):Promise<PrintifyImageUploadResponse> => {
  let data = new FormData();
  data.append('file', s);
  data.append('isListed', 'true');

  let cookieString = ""
  for (let c of cookies) {
    cookieString += `${c.name}=${c.value};`
  }
  //console.log(cookieString)

  let config = {
    method: 'post',
    url: 'https://images.printify.com/storage/anonymous',
    headers: { 
      'authority': 'images.printify.com', 
      'accept': 'application/json, text/plain, */*', 
      'accept-language': 'en-US,en;q=0.9', 
      'dnt': '1', 
      'origin': 'https://printify.com', 
      'referer': 'https://printify.com/', 
      'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"', 
      'sec-ch-ua-mobile': '?0', 
      'sec-ch-ua-platform': '"macOS"', 
      'sec-fetch-dest': 'empty', 
      'sec-fetch-mode': 'cors', 
      'sec-fetch-site': 'same-site', 
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36', 
      'Authorization': 'Bearer 8dzcVrdNq6nicp3kVploruC7Av8CLwxEBa4JTlDRWffdNkrPW2A8U0Vt2Jcj', 
      'Cookie': cookieString, //'__tld__=1; __zlcmid=1CwlNICZnvPct4f; _dc_gtm_UA-99780378-1=1; _ga=GA1.2.62316929.1668389680; _ga_4LD34WSM2H=GS1.1.1668459753.47.0.1668459753.60.0.0; _gat_UA-99780378-1=1; _gcl_au=1.1.1840639561.1668389680; _gid=GA1.2.791972153.1668389680; _hp2_hld105349977796574.2463375893=hld105349977796574; _hp2_hld1186994515001992.2463375893=hld1186994515001992; _hp2_hld1321757377151173.2463375893=hld1321757377151173; _hp2_hld1528790154558065.2463375893=hld1528790154558065; _hp2_hld1643723920256337.2463375893=hld1643723920256337; _hp2_hld1990897850585529.2463375893=hld1990897850585529; _hp2_hld2083369250017836.2463375893=hld2083369250017836; _hp2_hld2127607476565366.2463375893=hld2127607476565366; _hp2_hld2170454198577385.2463375893=hld2170454198577385; _hp2_hld3309058801094572.2463375893=hld3309058801094572; _hp2_hld3476728631461231.2463375893=hld3476728631461231; _hp2_hld3502807825857933.2463375893=hld3502807825857933; _hp2_hld3911712160189910.2463375893=hld3911712160189910; _hp2_hld391946870791091.2463375893=hld391946870791091; _hp2_hld4311126645478691.2463375893=hld4311126645478691; _hp2_hld4665727046313189.2463375893=hld4665727046313189; _hp2_hld4673299176124392.2463375893=hld4673299176124392; _hp2_hld4707416217493440.2463375893=hld4707416217493440; _hp2_hld4771238716588373.2463375893=hld4771238716588373; _hp2_hld512420623882561.2463375893=hld512420623882561; _hp2_hld5261355429821940.2463375893=hld5261355429821940; _hp2_hld5267141241882393.2463375893=hld5267141241882393; _hp2_hld5307651318023124.2463375893=hld5307651318023124; _hp2_hld5426705472818483.2463375893=hld5426705472818483; _hp2_hld5544985667385928.2463375893=hld5544985667385928; _hp2_hld6207099831738252.2463375893=hld6207099831738252; _hp2_hld6623071034312937.2463375893=hld6623071034312937; _hp2_hld6881606029590937.2463375893=hld6881606029590937; _hp2_hld7009783783021197.2463375893=hld7009783783021197; _hp2_hld7078112885544026.2463375893=hld7078112885544026; _hp2_hld720603942544526.2463375893=hld720603942544526; _hp2_hld7322006857379834.2463375893=hld7322006857379834; _hp2_hld7558707364383025.2463375893=hld7558707364383025; _hp2_hld7817102786589192.2463375893=hld7817102786589192; _hp2_hld8441143851640791.2463375893=hld8441143851640791; _hp2_hld8788202631373578.2463375893=hld8788202631373578; _hp2_hld8791173619119924.2463375893=hld8791173619119924; _hp2_hld8905700414059397.2463375893=hld8905700414059397; _hp2_id.2463375893=%7B%22userId%22%3A%22787941950783815%22%2C%22pageviewId%22%3A%228581073152202047%22%2C%22sessionId%22%3A%225329509023178563%22%2C%22identity%22%3Anull%2C%22trackerVersion%22%3A%224.0%22%7D; _hp2_ses_props.2463375893=%7B%22ts%22%3A1668455085310%2C%22d%22%3A%22printify.com%22%2C%22h%22%3A%22%2Fapp%2Feditor%2F77%2F29%22%7D; _rdt_uuid=1668389679862.3d53dc43-afe0-4681-93b1-15658ef32390; _tt_enable_cookie=1; _ttp=e21bf848-2eaa-4aaf-9888-bd6182a2f0b9; _uetsid=38c7c06062fc11edb5989dbac8cc0d89; _uetvid=55319ea012a911edbd369d92cb403b9e; _vis_opt_s=1%7C; _vis_opt_test_cookie=1; _vwo_ds=3%3At_1%2Ca_1%3A0%241668389679%3A29.4549627%3A36_19_1_0_2%3A21_1%2C20_1%2C19_2%2C10_1%2C9_1%2C8_1%3A5_1%2C3_1%2C2_1%3A0; _vwo_sn=65406%3A2%3Ar1.visualwebsiteoptimizer.com%3A2%3A1; _vwo_uuid=DF2CB8E7224E3507DFE88ECF273421E75; _vwo_uuid_v2=DF2CB8E7224E3507DFE88ECF273421E75|b6a7ae46b4032c5a67bdfafa36783d38; ajs_anonymous_id=52a32460-8952-4219-b4ac-2d1277de2cc8; ajs_user_id=10096983; ln_or=d; optimizelyEndUserId=oeu1668386414316r0.19998228983136346', 
      ...data.getHeaders()
    },
    data : data
  }

  let res = await axios(config)
  //console.log(JSON.stringify(res.data))
  return res.data as PrintifyImageUploadResponse
}