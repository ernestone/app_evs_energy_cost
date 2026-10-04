import assert from "node:assert/strict"
import test from "node:test"
import { parseDraft, type SessionDraft } from "./session-draft.ts"

const draft: SessionDraft = {
  lang: "es",
  display: "EUR",
  countryCode: "ES",
  gasoline: "1.6",
  diesel: "1.5",
  powerRows: [{ id: "home", label: "Casa", percent: "100", price: "0.2" }],
  evPurchase: "",
  icePurchase: "25000",
  evKwh: "16",
  evKwhEdited: true,
  iceLiters: "6",
  iceLitersEdited: true,
  iceKwh: "",
  iceKwhEdited: false,
  plugin: false,
  fuelShare: "50",
  elecShare: "50",
  horizon: 10,
  kmYear: "15000",
  cityPct: 55,
  phevMode: "epa",
  customShare: null,
  upstream: false,
  fuelPrice: "gasoline",
  ev: null,
  ice: null,
}

test("a saved comparison round-trips and a broken payload is ignored", () => {
  const parsed = parseDraft(JSON.stringify(draft))
  assert.deepEqual(parsed, draft)
  assert.equal(parseDraft("{"), null)
  assert.equal(parseDraft(JSON.stringify({ ...draft, horizon: 7 })), null)
  assert.equal(parseDraft(JSON.stringify({ ...draft, evKwh: 16 })), null)
  const legacy = { ...draft, fuelPrice: undefined }
  assert.equal(parseDraft(JSON.stringify(legacy))?.fuelPrice, "gasoline")
})
