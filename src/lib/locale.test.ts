import assert from "node:assert/strict"
import test from "node:test"
import { countryFromRequest, languageFromAcceptLanguage, languageFromList } from "./locale.ts"

const catalog = ["ES", "FR", "US", "GB"]

test("spanish is the language tag, not the region", () => {
  assert.equal(languageFromAcceptLanguage("es-MX,en;q=0.8"), "es")
  assert.equal(languageFromAcceptLanguage("en-ES,es;q=0.5"), "en")
  assert.equal(languageFromAcceptLanguage("ca-ES,es;q=0.4"), "en")
  assert.equal(languageFromAcceptLanguage("en;q=0.4, es;q=0.9"), "es")
  assert.equal(languageFromAcceptLanguage(null), "en")
  assert.equal(languageFromList(["es-ES", "en"]), "es")
  assert.equal(languageFromList(["en-ES", "es"]), "en")
  assert.equal(languageFromList([]), "en")
})

test("the request country is used only when it is in the catalog", () => {
  assert.equal(countryFromRequest("ES", catalog), "ES")
  assert.equal(countryFromRequest("gb", catalog), "GB")
  assert.equal(countryFromRequest("JP", catalog), "")
  assert.equal(countryFromRequest(null, catalog), "")
})
