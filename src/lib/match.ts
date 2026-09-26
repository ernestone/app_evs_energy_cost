/** Same brand and model. A longer US name is not treated as the same car. */

export function normName(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim()
}

export function modelKeys(make: string, commercial: string) {
  const full = normName(commercial)
  const keys = [full]
  const prefix = `${normName(make)} `
  if (full.startsWith(prefix)) {
    const rest = full.slice(prefix.length).trim()
    if (rest) keys.push(rest)
  }
  return keys
}

export function sameModel(make: string, commercial: string, epaMake: string, epaModel: string) {
  if (normName(make) !== normName(epaMake)) return false
  return modelKeys(make, commercial).includes(normName(epaModel))
}
