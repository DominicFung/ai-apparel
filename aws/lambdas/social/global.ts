import { sheets, sheets_v4 } from '@googleapis/sheets'

export const _spreadsheet = "10EvUZIYdCvB-FHQz7HYMKk195lkZqrEpadAJsnJPzJ4"
export const _masterSheetTitle = "Holidays"

export const _daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
export type DaysOfTheWeek = typeof _daysOfTheWeek[number]
export const primeTime = {
  Sunday: [{ hr: 10, pm: true, min: 5 }],
  Monday: [{ hr: 10, pm: true, min: 5 }],
  Tuesday: [{ hr: 10, pm: true, min: 5 }],
  Wednesday: [{ hr: 10, pm: true, min: 5 }],
  Thursday: [{ hr: 10, pm: true, min: 5 }],
  Friday: [{ hr: 10, pm: true, min: 5 }],
  Saturday: [{ hr: 10, pm: true, min: 5 }]
} as {[ d in DaysOfTheWeek ]: {hr: number, pm?: boolean, min: number}[]}

export const _headersMaster = [
  "Month", "Day", "Holidy", "Facebook", "Instagram", "ProductID", "Color",
  "Vibe", "Format", "Subject", "Perspective", "Artist", "Style", "Booster"
]
export type HeadersMaster = typeof _headersMaster[number]

export const _months = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export type Month = typeof _months[number]

export const _alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const _headersDrillDown = [
  "SocialId", "Year", "Month", "Day", "Hour", "Min", "Row", "Platform", "Holiday", 
  "Prompt", "Joke", "Image1", "Image2", "Image3",
  "Vibe", "Format", "Subject", "Perspective", "Artist", "Style", "Booster"
]
export type HeadersDrillDown = typeof _headersDrillDown[number]

export interface PostRequirment {
  holiday: string, 
  posts: number
  postBy: number // based on index of PrimeTimeCalendar
  row: number
}

export interface EmptyItinerary {
  postDate: {
    year: number,
    month: Month,
    day: number,
    hour: number,
    minute: number
  }
}

export interface Itinerary extends EmptyItinerary, PostRequirment { }

export const getSheetTab = async (
  auth: any, options: {
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
  
  params.ranges = [ `${options.tabName}!A1:${options.lastColumn}${options.lastRow}` ]
  const oursheet = await client.spreadsheets.get(params)
  const tabs = oursheet.data.sheets
  if (tabs && tabs.length > 0) {
    for (const t of tabs) {
      if (t.properties?.title === options.tabName) { return t } 
    }
  }

  console.log("getSheetTab() returning null ..")
  return null
}

export const placeholderHeader = <T extends string>(arr: T[]): {[k in T]: number} => {
  const obj = {} as {[k in T]: number}
  for (let i = 0; i < arr.length; i++) { obj[ arr[i] ] = -1 }
  return obj
}

export const head = <T extends string>(hh: T[], r: sheets_v4.Schema$RowData): {[k in T]: number} => {
  const h = placeholderHeader(hh) as {[k in T]: number}
  for (const c in r.values!) {
    if (r.values![c].formattedValue && Object.keys(h).includes(r.values![c].formattedValue as string))
      h[r.values![c].formattedValue as keyof typeof h] = Number.parseInt(c)
  }
  console.log(`HEADERS: ${JSON.stringify(h, null, 2)}`)

  // check headers before proceeding
  for (const k of Object.keys(h)) { 
    if (h[k as T] as {[k in T]: number} < 0) throw `Missing Header: ${k}. Check your Sheet.`
  }

  return h
}

export const _promptChoices = ["vibe", "format", "subject", "perspective", "artist", "style", "booster"]
export type Prompt = typeof _promptChoices[number]
const promptChoices = {
  vibe: ["control the soul","futuristic","utopian","dystopian","blade runner","cinematic","fantasy","elegant","no mods","magnificent","retrofuturistic","awesome","transhumanist ","✨","wormhole","eclectic","epic","tasteful","gorgeous","opaque","old","lsd trip","lofi","emo","lucid","moody","crystal","melancholy","cosmos","faded","uplight","concept art","atmospheric","dust","particulate","cute","stormy","magical","scenic","bold","colorful","metallic","eyes wide in wonder","awestruck","character","intricately designed","charming","f/1.4","grainy","blur","reflection","refraction","distortion","smears","smudges","ethereal","serene","spirited","kaleidoscopic","psychedelic","saturated","brash","tender","peaceful","funereal","melancholic","muted","ominous","unnerving","ghastly","curvaceous","monumental","manmade","emotive","amorphous","extemporaneous","spontaneous","jaunty","smoke effect","mysterious","neon","furry","hairy","bright","dark","made of yarn"],
  format: [ "photograph","painting","oil painting","line drawing","charcoal drawing","macro 35mm photograph","album art cover","one-line drawing","crayon drawing","pastel drawing","watercolor painting","pencil and watercolor drawing","vector art","stained glass window","cartoon","3d render","line art","pixel art","product photography","diagram","daguerreotype","screenshot from","displayed on a store mannequin","modeling photoshoot","cross stitched sampler","manuscripts","pencil sketch","advertising poster","illustration","in fortnite","on judge judy","captured on cctv","on sesame street","under electron microscope","kindergartener drawing","wikihow","fifth grade yearbook","courtroom sketch","on america's got talent","mugshot","in gta san andreas","us patent","in mario cart","news crew reporting live","cave painting","in minecraft","book cover","trail cam","polaroid","sketchbook","japanese wood block","medieval portrait","dashcam","security footage","disposable camera","autochrome","double exposure","editorial fashion photography","advertising campaign","vogue magazine cover","real estate photography","harsh flash photography","lomography","long-exposure photograph with slow shutter speed","camera obscura","pinhole photography","theatrical press release","press release","balloon float in the macy’s thanksgiving day parade","architectural photography from magazine","interior design","stunning photograph from lansdcaping magazine","travel photography","photoshopped image","full body photo","portrait","cgi","experimental expired film photo","action photography","sigma 75mm","shot on iPhone 6","on Flickr in 2007","cinematography from music video","professional corporate portrait","houdini 3D render","studio photography","street art","political cartoon from u.s. newspaper","colouring-in sheet","collage","vector art","storybook","layered paper","stop-motion animation","low poly","blueprint","ikea manual","patent drawing","instruction manual","pirate map","mythological map","voynich manuscript","claymation","tattoo","comic book art","decorative minoan mural","ancient egypt papyrus","roman mosaic","byzantine icon","terracotta warriors","marble statue","bronze statue","topiary","ice carving","origami","selfie","aztec carving","made of cake","spray-painted onto a wall","sticker illustration","linocut","aquatint print" ],
  subject: [ "rooster","chimpanzee","lemur","reindeer","toad","leopard","pig","rat","cheetah","camel","turtle","panther","rhino","tennis racket", "spoon","watch","empty jar","can of chili","box of chocolates","pants","trash bag","rat","light bulb","truck","flag","sponge","sailboat","dove","screwdriver","pair of tongs","postage stamp","children's book","broccoli","zebra","box","hair ribbon","bottle of paint","eraser","stick of incense","bottle of syrup","deodorant","twister","scallop","socks","pencil","batteries","paperclip","fridge","bar of soap","ice cube","wagon","magnifying glass","kitchen knife","sticky note","toothpaste","keychain","soda can","clay pot","shirt button","house","coaster","whistle","shoe lace","snowglobe","coffee pot","plate","bucket","feather" ],
  perspective: ["from behind","wide angle","fisheye lens","telephoto","wide angle","panoramic","bokeh","lens flare","hard lighting","landscape","drone","on canvas","close up","from below","from above","through a periscope","through a porthole","framed","dark background","white background","close up","close face","low angle","isometric","viewed from behind","85mm","oversaturated filter","sunset photo at golden hour","extreme close-up shot","midshot","head-and-shoulders shot","long shot","full shot","extreme wide shot","in the distance","overhead view","aerial view","tilted frame","over-the-shoulder shot","1/1000 sec shutter","motion blur","shallow depth of field","plain background","knolling"],
  artist: [ "alphonse mucha","pablo picasso","piet mondrian","jackson pollock","mark rothko","georges braque","andy warhol","roy lichtenstein","rené magritte","frida kahlo","dean cornwell","craig mullins","henri matisse","johannes vermeer","vincent van gogh","michelangelo","leonardo da vinci","georges seurat","thomas cole","greg rutkowski","gustave dore","ralph mcquarrie","zdzislaw beksinski","claude lorrain","james gurney","francisco goya","pierre auguste renoir","hayao miyazaki","bill watterson","claude monet","edvard munch","katsushika hokusai","funko pop","lucian freud","yoji shinkawa","utagawa kuniyoshi","toshi yoshid","diego rivera","hatsune miku","hieronymus bosch","caravaggio","gustave doré","frank frazetta","john constable","salvador dali","galen","pieter brueghel","annie leibovitz","wes anderson","frank gehry","saul leiter","dorothea lange","terry richardson","simon stålenhag","banksy","hanna barbera","beatrix potter","norman rockwell","dr suess","axel schaefer","keith haring","edward hopper","lisa frank","thomas kinkaid","basquiat","hr giger","brueghel the elder","duffer brothers","arcimboldo","fellini","keith haring","tim burton","mc escher","robert hargreaves","ivan shishkin","albert bierstadt","robert mccall","samuel daniell" ],
  style: [ "hudson river school","surrealism","dadaism","cubism","fauvism","renaissance","impressionist","baroque","rococo","romanticism","realism","pointillism","symbolism","neoclassicism","art nouveau","expressionism","constructivism ","futurism","suprematism","dadaism","art deco","pop art","ukiyo-e","vaporwave","synthwave","cyberpunk","prehistoric art","ancient art","suminagashi","medieval art","memphis design","abstract organic","skeumorphism","minimalism","photorealism","hieroglyphics","anime","pixar movies","corporate memphis","babylonian art","ancient egyptian art","steampunk","rgb gamer","game of thrones","fractal","chinese watercolor","abstract","post-apocalyptic","gothic","cybernetic","dieselpunk","afrofuturism","biopunk","airbrush","alegria","1990s disney, cel shading","vintage disney","vintage looney toons","south park","mannerism","post-impressionism","bauhaus","mexican muralism","the movie matrix","stranger things","low poly","glitchcore","rick and morty","avatar the last airbender","the simpsons","peppa pig" ],
  booster: ["trending on artstation","beautiful","vivid","professional","extremely detailed","stunning","wondrous","fantastic","contest winner","postprocessing","detailed","trending on /r/art","8k","4k resolution","vfx","rendered in unreal engine","octane render","digital art","photorealistic","hyperrealistic","rendering","very beautiful","hyper realistic","4k","blender 3d","70mm","high detail","arnold render","ultra high poly","zbrush","highly detailed","look at that detail","studio lighting","well preserved","high poly","unreal engine","#wow"]
} as {[k: Prompt]: string[]}

// [format] of [subject term], [perspective], by [artist:75] | by [artist:25] / in the style of [style], [variant], [booster], [exclusion]
// [vibe] [format] of [subject term], [perspective], by [artist] in the style of [style]
export const generatePrompt = (exceptions?: {[k: Prompt]: string[]}): { prompt: string, choice: {[k: Prompt]: string} } => {
  const vibe        = exceptions?.vibe ?        exceptions.vibe           [ Math.floor(Math.random() * exceptions.vibe.length) ] : 
                                                promptChoices.vibe        [ Math.floor(Math.random() * promptChoices.vibe.length) ]
  const format      = exceptions?.format ?      exceptions.format         [ Math.floor(Math.random() * exceptions.format.length) ]: 
                                                promptChoices.format      [ Math.floor(Math.random() * promptChoices.format.length) ]
  const subject     = exceptions?.subject ?     exceptions.subject        [ Math.floor(Math.random() * exceptions.subject.length) ]:
                                                promptChoices.subject     [ Math.floor(Math.random() * promptChoices.subject.length) ]
  const perspective = exceptions?.perspective ? exceptions.perspective    [ Math.floor(Math.random() * exceptions.perspective.length) ]:
                                                promptChoices.perspective [ Math.floor(Math.random() * promptChoices.perspective.length) ]
  const artist      = exceptions?.artist ?      exceptions.artist         [ Math.floor(Math.random() * exceptions.artist.length) ]:
                                                promptChoices.artist      [ Math.floor(Math.random() * promptChoices.artist.length) ]
  const style       = exceptions?.style ?       exceptions.style          [ Math.floor(Math.random() * exceptions.style.length) ]:
                                                promptChoices.style       [ Math.floor(Math.random() * promptChoices.style.length) ]
  const booster     = exceptions?.booster ?     exceptions.booster        [ Math.floor(Math.random() * exceptions.booster.length) ]:
                                                promptChoices.booster     [ Math.floor(Math.random()*promptChoices.booster.length) ]

  return { 
    prompt: `${vibe} ${format} of ${subject}, ${perspective}, by ${artist} in the style of ${style}, ${booster}.`, 
    choice: { vibe, format, subject, perspective, artist, style, booster }
  }
}