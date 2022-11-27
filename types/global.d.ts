const countryCode = [ 
  "CA", "US", "AX", "AL", "AD", "AM", "AT", "BY", "BA", "BE", "BV", "BG", "HR",
  "CY", "CZ", "DK", "EE", "FI", "FO", "FR", "GE", "GI", "DE", "GR", "GL", "GP",
  "GG", "VA", "IS", "HU", "IE", "IM", "JE", "IT", "LV", "LT", "LI", "LU", "MK", 
  "MT", "MC", "MD", "ME", "NL", "PL", "NO", "PT", "RO", "RE", "SM", "RS", "SK",
  "SI", "SE", "ES", "CH", "TR", "UA", "GB", "XK", "REST_OF_THE_WORLD"] as const
export type CountryCode = typeof countryCode[number]