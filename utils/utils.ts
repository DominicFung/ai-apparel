import { OrderItem } from "../types/order";
import { LocationBasedVariant } from "../types/printify";

import Filter from 'bad-words'
import TM from '@domfung/trademark'

export const BASEMARKUP = 1.9

export const validateEmail = (email: string) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export const setIntersepter = (b: boolean) => {
  window.onbeforeunload = function() {
    if (b) {
      return "Data will be lost, are you sure you want to continue?";
    } else {  }
  }
}

type SquareEnv = "sandbox" | "production"
export const SQUARE_ENV: SquareEnv = process.env.NODE_ENV === "production" ? "production" : "sandbox"

export const markup = (u: LocationBasedVariant, markup?: number | undefined): LocationBasedVariant => {
  u.price = u.price * (markup || BASEMARKUP )
  u.firstCost = u.firstCost * 1
  u.additionalCost = u.additionalCost * 1
  return u
}

export const calculatePrice = (ois: OrderItem[]): number => {
  let price = 0 // in cents
  let usedProvider: string[] = []
  for (let oi of ois) {
    let lookup = oi.varients
    for (let c of oi.choice) {
      for (let l of lookup) {
        if (l.id === c.variantId) {
          price += l.price * c.quantity
          
          // FREE SHIPPING FOR NOW!!!
          // if (usedProvider.includes(oi.printProviderId)) {
          //   price += (l.additionalCost) * c.quantity
          // } else {
          //   price += l.firstCost
          //   price += (l.additionalCost * (c.quantity - 1))
          // }
          break
        }
      }
    }
  }

  return price
}

export const currency = [ 
  "CAD", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN","BAM", "BBD", 
  "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", 
  "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", 
  "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "FOK", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", 
  "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", 
  "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", 
  "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", 
  "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", 
  "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", 
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", 
  "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TVD", "TWD", 
  "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", 
  "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL" as const
]
export type Currency = typeof currency[number]

export interface Conversion {
  "result": "success" | "error"
  "provider": string
  "documentation": string
  "terms_of_use": string
  "time_last_update_unix": number
  "time_last_update_utc": string
  "time_next_update_unix": number
  "time_next_update_utc": string
  "time_eol_unix": number
  "base_code": Currency,
  "rates": {
    [key: Currency]: number
  }
}

export const isBright = (color: string): boolean => {
  const hex = color.replace('#', '');
  const c_r = parseInt(hex.substring(0, 0 + 2), 16);
  const c_g = parseInt(hex.substring(2, 2 + 2), 16);
  const c_b = parseInt(hex.substring(4, 4 + 2), 16);
  const brightness = ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
  return brightness > 155;
}

export const hasProfanity = (s: string): boolean => {
  const filter = new Filter()
  return filter.isProfane(s)
}

export const hasTrademark = (s: string): boolean => {
  const tm = new TM()
  return tm.isTrademarked(s)
}

const promptChoices = {
  vibe: ["control the soul","futuristic","utopian","dystopian","blade runner","cinematic","fantasy","elegant","no mods","magnificent","retrofuturistic","awesome","transhumanist ","✨","wormhole","eclectic","epic","tasteful","gorgeous","opaque","old","lsd trip","lofi","emo","lucid","moody","crystal","melancholy","cosmos","faded","uplight","concept art","atmospheric","dust","particulate","cute","stormy","magical","scenic","bold","colorful","metallic","eyes wide in wonder","awestruck","character","intricately designed","charming","f/1.4","grainy","blur","reflection","refraction","distortion","smears","smudges","ethereal","serene","spirited","kaleidoscopic","psychedelic","saturated","brash","tender","peaceful","funereal","melancholic","muted","ominous","unnerving","ghastly","curvaceous","monumental","manmade","emotive","amorphous","extemporaneous","spontaneous","jaunty","smoke effect","mysterious","neon","furry","hairy","bright","dark","made of yarn"],
  format: [ "photograph","painting","oil painting","line drawing","charcoal drawing","macro 35mm photograph","album art cover","one-line drawing","crayon drawing","pastel drawing","watercolor painting","pencil and watercolor drawing","vector art","stained glass window","cartoon","3d render","line art","pixel art","product photography","diagram","daguerreotype","screenshot from","displayed on a store mannequin","modeling photoshoot","cross stitched sampler","manuscripts","pencil sketch","advertising poster","illustration","in fortnite","on judge judy","captured on cctv","on sesame street","under electron microscope","kindergartener drawing","wikihow","fifth grade yearbook","courtroom sketch","on america's got talent","mugshot","in gta san andreas","us patent","in mario cart","news crew reporting live","cave painting","in minecraft","book cover","trail cam","polaroid","sketchbook","japanese wood block","medieval portrait","dashcam","security footage","disposable camera","autochrome","double exposure","editorial fashion photography","advertising campaign","vogue magazine cover","real estate photography","harsh flash photography","lomography","long-exposure photograph with slow shutter speed","camera obscura","pinhole photography","theatrical press release","press release","balloon float in the macy’s thanksgiving day parade","architectural photography from magazine","interior design","stunning photograph from lansdcaping magazine","travel photography","photoshopped image","full body photo","portrait","cgi","experimental expired film photo","action photography","sigma 75mm","shot on iPhone 6","on Flickr in 2007","cinematography from music video","professional corporate portrait","houdini 3D render","studio photography","street art","political cartoon from u.s. newspaper","colouring-in sheet","collage","vector art","storybook","layered paper","stop-motion animation","low poly","blueprint","ikea manual","patent drawing","instruction manual","pirate map","mythological map","voynich manuscript","claymation","tattoo","comic book art","decorative minoan mural","ancient egypt papyrus","roman mosaic","byzantine icon","terracotta warriors","marble statue","bronze statue","topiary","ice carving","origami","selfie","aztec carving","made of cake","spray-painted onto a wall","sticker illustration","linocut","aquatint print" ],
  subject: [ "rooster","chimpanzee","lemur","reindeer","toad","leopard","pig","rat","cheetah","camel","turtle","panther","rhino","tennis racket", "spoon","watch","empty jar","can of chili","box of chocolates","pants","trash bag","rat","light bulb","truck","flag","sponge","sailboat","dove","screwdriver","pair of tongs","postage stamp","children's book","broccoli","zebra","box","hair ribbon","bottle of paint","eraser","stick of incense","bottle of syrup","deodorant","twister","scallop","socks","pencil","batteries","paperclip","fridge","bar of soap","ice cube","wagon","magnifying glass","kitchen knife","sticky note","toothpaste","keychain","soda can","clay pot","shirt button","house","coaster","whistle","shoe lace","snowglobe","coffee pot","plate","bucket","feather" ],
  perspective: ["from behind","wide angle","fisheye lens","telephoto","wide angle","panoramic","bokeh","lens flare","hard lighting","landscape","drone","on canvas","close up","from below","from above","through a periscope","through a porthole","framed","dark background","white background","close up","close face","low angle","isometric","viewed from behind","85mm","oversaturated filter","sunset photo at golden hour","extreme close-up shot","midshot","head-and-shoulders shot","long shot","full shot","extreme wide shot","in the distance","overhead view","aerial view","tilted frame","over-the-shoulder shot","1/1000 sec shutter","motion blur","shallow depth of field","plain background","knolling"],
  artist: [ "alphonse mucha","pablo picasso","piet mondrian","jackson pollock","mark rothko","georges braque","andy warhol","roy lichtenstein","rené magritte","frida kahlo","dean cornwell","craig mullins","henri matisse","johannes vermeer","vincent van gogh","michelangelo","leonardo da vinci","georges seurat","thomas cole","greg rutkowski","gustave dore","ralph mcquarrie","zdzislaw beksinski","claude lorrain","james gurney","francisco goya","pierre auguste renoir","hayao miyazaki","bill watterson","claude monet","edvard munch","katsushika hokusai","funko pop","lucian freud","yoji shinkawa","utagawa kuniyoshi","toshi yoshid","diego rivera","hatsune miku","hieronymus bosch","caravaggio","gustave doré","frank frazetta","john constable","salvador dali","galen","pieter brueghel","annie leibovitz","wes anderson","frank gehry","saul leiter","dorothea lange","terry richardson","simon stålenhag","banksy","hanna barbera","beatrix potter","norman rockwell","dr suess","axel schaefer","keith haring","edward hopper","lisa frank","thomas kinkaid","basquiat","hr giger","brueghel the elder","duffer brothers","arcimboldo","fellini","keith haring","tim burton","mc escher","robert hargreaves","ivan shishkin","albert bierstadt","robert mccall","samuel daniell" ],
  style: [ "hudson river school","surrealism","dadaism","cubism","fauvism","renaissance","impressionist","baroque","rococo","romanticism","realism","pointillism","symbolism","neoclassicism","art nouveau","expressionism","constructivism ","futurism","suprematism","dadaism","art deco","pop art","ukiyo-e","vaporwave","synthwave","cyberpunk","prehistoric art","ancient art","suminagashi","medieval art","memphis design","abstract organic","skeumorphism","minimalism","photorealism","hieroglyphics","anime","pixar movies","corporate memphis","babylonian art","ancient egyptian art","steampunk","rgb gamer","game of thrones","fractal","chinese watercolor","abstract","post-apocalyptic","gothic","cybernetic","dieselpunk","afrofuturism","biopunk","airbrush","alegria","1990s disney, cel shading","vintage disney","vintage looney toons","south park","mannerism","post-impressionism","bauhaus","mexican muralism","the movie matrix","stranger things","low poly","glitchcore","rick and morty","avatar the last airbender","the simpsons","peppa pig" ],
  booster: ["trending on artstation","beautiful","vivid","professional","extremely detailed","stunning","wondrous","fantastic","contest winner","postprocessing","detailed","trending on /r/art","8k","4k resolution","vfx","rendered in unreal engine","octane render","digital art","photorealistic","hyperrealistic","rendering","very beautiful","hyper realistic","4k","blender 3d","70mm","high detail","arnold render","ultra high poly","zbrush","highly detailed","look at that detail","studio lighting","well preserved","high poly","unreal engine","#wow"]
}


//https://www.saxifrage.xyz/post/prompt-engineering
//http://localhost:3000/p/473/i/fnjwpjme4rfnfaipptlgkg6x5i
//http://commaquote.azurewebsites.net/

// [format] of [subject term], [perspective], by [artist:75] | by [artist:25] / in the style of [style], [variant], [booster], [exclusion]
// [vibe] [format] of [subject term], [perspective], by [artist] in the style of [style]
export const generatePrompt = (): string => {
  const vibe        = promptChoices.vibe        [ Math.floor(Math.random()*promptChoices.vibe.length) ]
  const format      = promptChoices.format      [ Math.floor(Math.random()*promptChoices.format.length) ]
  const subject     = promptChoices.subject     [ Math.floor(Math.random()*promptChoices.subject.length) ]
  const perspective = promptChoices.perspective [ Math.floor(Math.random()*promptChoices.perspective.length) ]
  const artist      = promptChoices.artist      [ Math.floor(Math.random()*promptChoices.artist.length) ]
  const style       = promptChoices.style       [ Math.floor(Math.random()*promptChoices.style.length) ]
  const booster     = promptChoices.booster     [ Math.floor(Math.random()*promptChoices.booster.length) ]

  return `${vibe} ${format} of ${subject}, ${perspective}, by ${artist} in the style of ${style}, ${booster}.`
}