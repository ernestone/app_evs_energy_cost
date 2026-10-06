import assert from "node:assert/strict"
import test from "node:test"
import { isOwner, normalizeLogin, ownerLogin } from "./access.ts"

test("the default owner is ernestone and a missing login is not", () => {
  const previous = process.env.ADMIN_GITHUB_LOGIN
  delete process.env.ADMIN_GITHUB_LOGIN
  assert.equal(ownerLogin(), "ernestone")
  assert.equal(isOwner("ernestone"), true)
  assert.equal(isOwner("ErnestOne"), true)
  assert.equal(isOwner(""), false)
  assert.equal(isOwner(null), false)
  assert.equal(isOwner(undefined), false)
  assert.equal(isOwner("someone-else"), false)
  process.env.ADMIN_GITHUB_LOGIN = "   "
  assert.equal(ownerLogin(), "")
  assert.equal(isOwner("ernestone"), false)
  assert.equal(isOwner(""), false)
  if (previous === undefined) delete process.env.ADMIN_GITHUB_LOGIN
  else process.env.ADMIN_GITHUB_LOGIN = previous
})

test("allowlist logins are github usernames", () => {
  assert.equal(normalizeLogin("  Ada-Lovelace "), "ada-lovelace")
  assert.equal(normalizeLogin(""), null)
  assert.equal(normalizeLogin("has space"), null)
  assert.equal(normalizeLogin("a".repeat(40)), null)
})
