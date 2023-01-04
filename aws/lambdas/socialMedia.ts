//import { Configuration, OpenAIApi } from 'openai'
import { auth, sheets, sheets_v4 } from '@googleapis/sheets'

import { SecretsManagerClient, SecretsManagerClientConfig, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

//import moment from 'moment'

const _spreadsheet = "10EvUZIYdCvB-FHQz7HYMKk195lkZqrEpadAJsnJPzJ4"
const _masterSheetTitle = "Holidays"

const _daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
export type DaysOfTheWeek = typeof _daysOfTheWeek[number]
const primeTime = {
  Sunday: [{ hr: 10, pm: true, min: 5 }],
  Monday: [{ hr: 10, pm: true, min: 5 }],
  Tuesday: [{ hr: 10, pm: true, min: 5 }],
  Wednesday: [{ hr: 10, pm: true, min: 5 }],
  Thursday: [{ hr: 10, pm: true, min: 5 }],
  Friday: [{ hr: 10, pm: true, min: 5 }],
  Saturday: [{ hr: 10, pm: true, min: 5 }]
} as {[ d in DaysOfTheWeek ]: {hr: number, pm?: boolean, min: number}[]}

const _headersMaster = ["Month", "Day", "Holidy", "Facebook", "Instagram", "Vibe" ] as const
export type HeadersMaster = typeof _headersMaster[number]

const _months = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const
export type Month = typeof _months[number]

const _alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const _headersDrillDown = ["Year", "Month", "Day", "Hour", "Min", "Row", "Platform"]
export type HeadersDrillDown = typeof _headersDrillDown[number]

interface PostRequirment {
  holiday: string, 
  posts: number
  postBy: number // based on index of PrimeTimeCalendar
  row: number,

  // postDate: {
  //   year: number,
  //   month: Month,
  //   day: number
  // }
}

interface EmptyPost {
  postDate: {
    year: number,
    month: Month,
    day: number,
    hour: number,
    minute: number
  }
}

interface Post extends EmptyPost, PostRequirment { }

/**
 * Main processor for "Holidy" page.
 * 
 * This functions takes the sheet tab "Holidy" and parses for: 
 *    - each holidays
 *    - the number of posts intended for that holiday 
 *    - the prompt requirements for that holiday.
 * 
 * This algorithm then moves that info to their own tabs: "<Month> <Year>" 
 * and creates a row for each post specifying the Year, Month, Day, Hour, Minute and Platform this item is to be posted.
 * 
 * These posts are NOT SCHEDULED, until the next algorithm (Where the post details are to be specified).
 * 
 * Version 1 (Jan 2, 2023)
 *  This algorithm DOES NOT override months that are not part of the "scope".
 *    ie. We schedule posts for the specified month and the 11 months after. 
 *    Upon invocation, we wipe the current schedule within scope and start a new. 
 *    Anything already published will not be taken into account. 
 *    This might result in 
 *    
 *  Understandably, this also causes hard cutoffs between the previous scheduled scope and the current one.
 *  All these issues can be fixed in a future version (If time allows)
 * 
 * @param event 
 * @returns 
 */
export const processHolidays = async (event: any): Promise<{statusCode: number, body: string}> => {
  console.log(event)
  if (!event.body)        return { statusCode: 400, body: "bad request" }
  const body = JSON.parse(event.body) as { month: Month, year: string }

  if (!body.month)  return { statusCode: 400, body: "missing month" }
  if (!_months.includes(body.month)) 
    return { statusCode: 400, body: "month is not an acceptable value" }

  if (!body.year)   return { statusCode: 400, body: "missing year" }
  if (Number.parseInt(body.year) < 2022) return { statusCode: 400, body: "year needs to be a number larger than 2022" }
  
  const b = {
    month: body.month as Month,
    year: Number.parseInt(body.year)
  }

  const config = {} as SecretsManagerClientConfig
  const smc = new SecretsManagerClient(config)
  const command = new GetSecretValueCommand({
    SecretId: "aiapparel/secret"
  })
  const rawsecret = (await smc.send(command)).SecretString
  if (rawsecret) {
    const secret = JSON.parse(rawsecret) as any

    const authClient = await (new auth.GoogleAuth({ 
      credentials: secret.google,
      scopes: [ "https://www.googleapis.com/auth/spreadsheets" ]
    })).getClient()

    const masterTab = await getSheetTab(authClient, { tabName: _masterSheetTitle, lastRow: 200, lastColumn: "Z" })
    if (masterTab && masterTab.data) {

      let headers = {
        "Month": -1, "Day": -1, "Holidy": -1, "Facebook": -1, "Instagram": -1, "Vibe": -1,
      } as {[k in HeadersMaster]: number}

      let fb = [] as PostRequirment[]
      let insta = [] as PostRequirment[]

      // First pass is about indexing rows and storing them into memory.
      let mem = { year: b.year, month: b.month, day: 0, count: 0 } as { year: number, month: Month, day: number, count: number }

      const grid = masterTab.data![0] // should only be one, since we always submit only 1 range
      if (!grid) { return { statusCode: 500, body: `Tab ${_masterSheetTitle} range could not be found` } }

      for (const {r, i} of grid.rowData!.map((r, i) => ({r, i}))) {
        if (i === 0) { // parse headers
          for (const c in r.values!) {
            if (r.values![c].formattedValue && Object.keys(headers).includes(r.values![c].formattedValue as string))
              headers[r.values![c].formattedValue as keyof typeof headers] = Number.parseInt(c)
          }
          console.log(`HEADERS: ${JSON.stringify(headers, null, 2)}`)

          // check headers before proceeding
          for (const k of Object.keys(headers)) { 
            if (headers[k as unknown as HeadersMaster] < 0) 
              return { statusCode: 400, body: `Missing Header: ${k}. Check your Sheet.` }
          }
        } else {
          // Check: this is a valid row for parsing & skips rows that happen before our month.
          if (
            r.values && r.values[headers.Month].effectiveValue?.stringValue && r.values[headers.Day].effectiveValue?.numberValue &&
            _months.indexOf(b.month) <=_months.indexOf(r.values[headers.Month].effectiveValue?.stringValue! as Month)
          ) {
            let count = getPrimeTimesPerWeekDayDiff(
              { year: mem.year, month: _months.indexOf(mem.month), day: mem.day },
              { year: mem.year, month: _months.indexOf(r.values[headers.Month]!.effectiveValue!.stringValue! as Month), day: r.values[headers.Day].effectiveValue!.numberValue!}
            )

            mem.month = r.values[headers.Month]!.effectiveValue!.stringValue! as Month
            mem.day   = r.values[headers.Day].effectiveValue!.numberValue!
            mem.count = mem.count + count

            fb.push({ 
              holiday: r.values![headers.Holidy].effectiveValue?.stringValue as string,
              posts: r.values![headers.Facebook].effectiveValue?.numberValue || 0,
              postBy: mem.count - 1,
              row: i,
              //postDate: { year: mem.year, month: mem.month, day: mem.day }
            })

            insta.push({
              holiday: r.values![headers.Holidy].effectiveValue?.stringValue as string,
              posts: r.values![headers.Instagram].effectiveValue?.numberValue || 0,
              postBy: mem.count - 1,
              row: i,
              //postDate: { year: mem.year, month: mem.month, day: mem.day }
            })
          }
        }
      }

      console.log(mem) // RESET
      mem.year++, mem.month="January"; mem.day=0

      for (const {r, i} of grid.rowData!.map((r, i) => ({r, i}))) {
        if (i === 0) { continue /** skip first row */ }
        if (
          r.values && r.values[headers.Month].effectiveValue?.stringValue && r.values[headers.Day].effectiveValue?.numberValue &&
          _months.indexOf(b.month) < _months.indexOf(r.values[headers.Month].effectiveValue?.stringValue! as Month)
        ) {
          let count = getPrimeTimesPerWeekDayDiff(
            { year: mem.year, month: _months.indexOf(mem.month), day: mem.day },
            { year: mem.year, month: _months.indexOf(r.values[headers.Month]!.effectiveValue!.stringValue! as Month), day: r.values[headers.Day].effectiveValue!.numberValue!}
          )

          mem.month = r.values[headers.Month]!.effectiveValue!.stringValue! as Month
          mem.day   = r.values[headers.Day].effectiveValue!.numberValue!
          mem.count = mem.count + count

          fb.push({ 
            holiday: r.values![headers.Holidy].effectiveValue?.stringValue as string,
            posts: r.values![headers.Facebook].effectiveValue?.numberValue || 0,
            postBy: mem.count - 1,
            row: i,
            //postDate: { year: mem.year, month: mem.month, day: mem.day }
          })

          insta.push({
            holiday: r.values![headers.Holidy].effectiveValue?.stringValue as string,
            posts: r.values![headers.Instagram].effectiveValue?.numberValue || 0,
            postBy: mem.count - 1,
            row: i,
            //postDate: { year: mem.year, month: mem.month, day: mem.day }
          })
        } else break
      }

      console.log(`=== Facebook Schedule === `)
      const schedule1 = generateSchedule({year: b.year, month: _months.indexOf(b.month), day: 0}, mem.count, fb)
      console.log(`=== Facebook Schedule === `)
      console.log(schedule1)

      console.log(`=== Instagram Schedule === `)
      const schedule2 = generateSchedule({year: b.year, month: _months.indexOf(b.month), day: 0}, mem.count, insta)
      console.log(`=== Instagram Schedule === `)
      console.log(schedule2)

      return await createDrillDownTabs(authClient, [
        { posts: schedule1, platform: "FaceBook" },
        { posts: schedule2, platform: "Instagram" }
      ])
    }

    return { statusCode: 500, body: "Server Error" }
  }
  return { statusCode: 500, body: "Server Error" }
}

/** Helpers */
const getSheetTab = async (
  auth: any, options?: {
    tabName: string, lastRow: number, lastColumn: string, 
  }
): Promise<sheets_v4.Schema$Sheet|null> => {
  const client = sheets({
    version: "v4", auth
  })
  let params = {
    spreadsheetId: _spreadsheet,
    includeGridData: true
  } as sheets_v4.Params$Resource$Spreadsheets$Get
  if (options) { params.ranges = [ `${options.tabName}!A1:${options.lastColumn}${options.lastRow}` ] } 
  const oursheet = await client.spreadsheets.get(params)
  const tabs = oursheet.data.sheets
  if (tabs && tabs.length > 0) {
    for (const t of tabs) {
      if (t.properties?.title === _masterSheetTitle) { return t } 
    }
  }

  console.log("getSheetTab() returning null ..")
  return null
}

const getPrimeTimesPerWeekDayDiff = (
  s: { year: number, month: number, day: number }, 
  e: { year: number, month: number, day: number }, 
): number => {
  let start = new Date(s.year, s.month, s.day)
  let end = new Date(e.year, e.month, e.day)

  const startDay = start.getDay()
  let days = {} as { [ d in DaysOfTheWeek ]: number }
  for (const day of _daysOfTheWeek) { days[day] = 0 }

  let count = 0
  let currentDay = startDay
  while (start < end) {
    days[_daysOfTheWeek[currentDay]] = days[_daysOfTheWeek[currentDay]] + primeTime[_daysOfTheWeek[currentDay]].length
    count = count + primeTime[_daysOfTheWeek[currentDay]].length
    
    currentDay = (currentDay + 1) % 7
    start.setDate(start.getDate() + 1)
  }
  return count
}

const generateSchedule = (
  s: { year: number, month: number, day: number }, 
  primeTimes: number, requirements: PostRequirment[]
): (Post|EmptyPost)[] => {
  let schedule = Array(primeTimes).fill(null) as (Post|EmptyPost)[]

  let start = new Date(s.year, s.month, s.day)

  const startDay = start.getDay()
  let days = {} as { [ d in DaysOfTheWeek ]: number }
  for (const day of _daysOfTheWeek) { days[day] = 0 }

  let count = 0
  let currentDay = startDay
  for (const i in schedule) {
    let dotw = _daysOfTheWeek[count]
    for (const j in primeTime[dotw]) {
      const info = primeTime[_daysOfTheWeek[count]][j]
      schedule[i] = { postDate: { 
        year: start.getFullYear(), 
        month: _months[start.getMonth()],
        day: start.getDate(),
        hour: info.hr,
        minute: info.min
      } } as EmptyPost
    }
    
    currentDay = (currentDay + 1) % 7
    start.setDate(start.getDate() + 1)
  }

  for (const r of requirements) {
    let conflict = [] as { index: number, r1: Post, r2: PostRequirment, bias: number }[]  // this is a queue
    let i = r.postBy, posts = r.posts
    while (posts > 0) {
      if (i < 0) { console.warn(`while scheduling ${r.holiday}, This holiday will not get the number of post specified by admin. You're short by ${r.posts - (r.postBy-i)} posts.`); break }
      if (i >= schedule.length ) { console.error(`Index out of error while scheduling ${r.holiday}. This should not be possible`); break}

      if (schedule[i] === null) { console.error(`Null detected in schedule[${i}]`) }
      else if (!(schedule[i] as Post ).holiday) { schedule[i] = {...r, postDate: { ...schedule[i].postDate }}; posts-- }
      else if (i === (schedule[i] as Post).postBy ) { /** Do nothing, this is the exact holiday date */ }
      else { conflict.push({ index: i, r1: schedule[i] as Post, r2: r, bias: 0.6 }); posts-- }
      i--
    }

    // resolve all conflicts
    let count = 0
    const _bias = 0.05
    while (conflict.length > 0) {
      const c = conflict.shift()!
      let toSchedule = c.r1 as PostRequirment
      if (Math.random() <= c.bias) {
        schedule[c.index] = { ...c.r2, postDate: { ...schedule[c.index].postDate } }
      } else {
        schedule[c.index] = { ...c.r1, postDate: { ...schedule[c.index].postDate } }
        toSchedule = c.r2
      }

      if ( i < 0 || i >= schedule.length ) { console.warn(`i is now out of bounds (${i}), will not be creating anymore conflicts`); break }

      if (schedule[i] === null) { console.error(`Null detected in schedule[${i}]`) }
      else if (!(schedule[i] as Post ).holiday) { schedule[i] = { ...toSchedule, postDate: { ...schedule[i].postDate } }}
      else if (i === (schedule[i] as Post).postBy) { /** Do nothing, this is the exact holiday date */ }
      else {
        if ((schedule[i] as Post).holiday !== c.r1.holiday && (schedule[i] as Post).holiday !== c.r2.holiday) { count++ } 
        conflict.push({ index: i, r1: schedule[i] as Post, r2: toSchedule, bias: _bias*count })
        count++
      }
      i--
    }

    console.log(r)
    console.log(schedule)
  }

  return schedule
}

const createDrillDownTabs = async (
  auth: any, dds: { 
    posts: (Post|EmptyPost)[], platform: "FaceBook" | "Instagram" 
  }[]
): Promise<{ statusCode: number, body: string }> => {
  const len = dds[0].posts.length
  for (const dd of dds) { 
    if (dd.posts.length !== len) { 
      console.error("Lenght of post is expected to be the same in the version of the algorithm (Verson 1).")
      return { statusCode: 500, body: "Could not create Tabs, Post length missmatch. Server Error." }
    }
  }

  const client = sheets({ version: "v4", auth})
  const getSheetParams = {
    spreadsheetId: _spreadsheet,
  } as sheets_v4.Params$Resource$Spreadsheets$Get

  let currentYear = dds[0].posts[0].postDate.year
  let currentMonth = dds[0].posts[0].postDate.month
  const currentGrid = await client.spreadsheets.get(getSheetParams)
  console.log(JSON.stringify(currentGrid, null, 2))
  
  let tabsInventory = {} as {[k: string]: number}
  for (const t of currentGrid.data.sheets!) {
    if (t.properties?.title && t.properties?.sheetId) tabsInventory[t.properties.title] = t.properties.sheetId
  }

  // let batchUpdateParams = {
  //   spreadsheetId: _spreadsheet,
  //   requestBody: {
  //     requests: [{
  //       addSheet: { properties: { title: sheetTitle } },
  //       updateCells: { fields: "*", rows: [{ 
  //         values: _headersDrillDown.map( h => { return { userEnteredValue: { stringValue: h } } as sheets_v4.Schema$CellData })
  //       }] }
  //     }]
  //   }
  // } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate

  let values = [ _headersDrillDown ] as (string|number)[][]

  for (let i=0; i<len; i++) {
    const sheetTitle = `${currentMonth}${currentYear}`
    if ( currentYear !== dds[0].posts[i].postDate.year || currentMonth !== dds[0].posts[i].postDate.month) {
      if (tabsInventory[sheetTitle]) {
        // const deleteSheetParams = {
        //   spreadsheetId: _spreadsheet, 
        //   requestBody: {
        //     requests: [{ deleteSheet: tabsInventory[sheetTitle] }]
        //   }
        // } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate
        
        // console.log(`Deleting Sheet ${sheetTitle} with ID: ${tabsInventory[sheetTitle]}`)
        // console.log( await client.spreadsheets.batchUpdate(deleteSheetParams) )
        console.log(`No need to delete ${sheetTitle} for now,`)
      } else {
        await client.spreadsheets.batchUpdate({
          spreadsheetId: _spreadsheet,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: sheetTitle } }
            }]
          }
        })
      }

      console.log(`Creating / Writing Sheet ${sheetTitle} with ID: ${tabsInventory[sheetTitle]}`)
      console.log(JSON.stringify(values, null, 2))
      console.log( await client.spreadsheets.values.update({
        spreadsheetId: _spreadsheet,
        valueInputOption: "USER_ENTERED",
        range: `${sheetTitle}!A1:${_alphabet.charAt(_headersDrillDown.length-1)}${values.length}`,
        requestBody: { values },
      }) )

      /** Reset currentMonth / currentYear */
      currentMonth = dds[0].posts[i].postDate.month, currentYear = dds[0].posts[i].postDate.year 

      /** Reset batchUpdateParams */
      // batchUpdateParams.requestBody!.requests! = [{
      //   addSheet: { properties: { title: sheetTitle } },
      //   updateCells: { fields: "*", rows: [{ 
      //     values: _headersDrillDown.map( h => { return { userEnteredValue: { stringValue: h } } as sheets_v4.Schema$CellData })
      //   }] }
      // }]
      values = [ _headersDrillDown ]
    } else {
      for (let j=0; j<dds.length; j++) {
        // If not an EmptyPost -- add to sheet
        if ((dds[j].posts[i] as Post).holiday) {
          const r = {
            year:     dds[j].posts[i].postDate.year,
            month:    dds[j].posts[i].postDate.month,
            day:      dds[j].posts[i].postDate.day,
            hour:     dds[j].posts[i].postDate.hour,
            min:      dds[j].posts[i].postDate.minute,
            row:     (dds[j].posts[i] as Post).row,
            platform: dds[j].platform
          }

          const row = [ r.year, r.month, r.day, r.hour, r.min, r.row, r.platform ]
          // batchUpdateParams.requestBody!.requests!.push({
          //   updateCells: { fields: "*", rows: [{
          //     values: row.map( r => { 
          //       if (typeof r === "number") return { userEnteredValue: { numberValue: r } } as sheets_v4.Schema$CellData
          //       else return { userEnteredValue: { stringValue: r.toString() } } as sheets_v4.Schema$CellData
          //     })
          //   }] }
          // })
          values.push(row)
        }
      }
    }
  }

  return { statusCode: 200, body: "OK" }
}



// Open AI
// const configuration = new Configuration({
//   organization: secret.openai.organization,
//   apiKey: secret.openai.apiKey,
// })

// const openai = new OpenAIApi(configuration)
// const response = await openai.listModels()
// console.log(response)

// for (const m of response.data.data) {
//   console.log(m.id)
// }