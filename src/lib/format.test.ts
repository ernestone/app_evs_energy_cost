import assert from "node:assert/strict"
import test from "node:test"
import { formatMoney, formatNumber, parseLegacyPrice, parsePrice, priceInput, upgradeLegacyInput } from "./format.ts"

test("shown numbers group thousands in Spanish and English", () => {
  assert.equal(formatNumber(1735, "es", 0), "1.735")
  assert.equal(formatNumber(53.38, "es", 2), "53,38")
  assert.equal(formatNumber(1735.5, "en", 2), "1,735.50")
  assert.equal(formatNumber(0.17, "es", 4), "0,1700")
  assert.match(formatMoney(1735, "EUR", "es", 0), /1\.735/)
})

test("editable fields keep the same number when a thousands separator is typed", () => {
  assert.equal(parsePrice("1.735", "es"), 1735)
  assert.equal(parsePrice("15.000", "es"), 15000)
  assert.equal(parsePrice("1.735,50", "es"), 1735.5)
  assert.equal(parsePrice("53,38", "es"), 53.38)
  assert.equal(parsePrice("1,928", "es"), 1.928)
  assert.equal(parsePrice("0,2669", "es"), 0.2669)
  assert.equal(parsePrice("1,735", "en"), 1735)
  assert.equal(parsePrice("15,000", "en"), 15000)
  assert.equal(parsePrice("1,735.50", "en"), 1735.5)
  assert.equal(parsePrice("1.928", "en"), 1.928)
  assert.equal(parsePrice("0.2669", "es"), 0.2669)
})

test("programmatic prices round-trip without changing the value", () => {
  assert.equal(priceInput(1.927981, "es"), "1,928")
  assert.equal(parsePrice(priceInput(1.927981, "es"), "es"), 1.928)
  assert.equal(priceInput(15000, "es"), "15.000")
  assert.equal(parsePrice(priceInput(15000, "es"), "es"), 15000)
  assert.equal(priceInput(0.2669, "es"), "0,2669")
  assert.equal(parsePrice(priceInput(0.2669, "es"), "es"), 0.2669)
  assert.equal(priceInput(15000, "en"), "15,000")
  assert.equal(parsePrice(priceInput(634.8792302819932, "es"), "es"), 634.8792)
})

test("an old dot-decimal draft keeps its numeric value", () => {
  assert.equal(parseLegacyPrice("1.928"), 1.928)
  assert.equal(parseLegacyPrice("15.000"), 15)
  assert.equal(upgradeLegacyInput("1.928", "es"), "1,928")
  assert.equal(parsePrice(upgradeLegacyInput("1.928", "es"), "es"), 1.928)
  assert.equal(upgradeLegacyInput("15000", "es"), "15.000")
  assert.equal(parsePrice(upgradeLegacyInput("15000", "es"), "es"), 15000)
  assert.equal(upgradeLegacyInput("0.2669", "en"), "0.2669")
})
