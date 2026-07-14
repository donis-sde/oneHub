/**
 * Seeds platform demo users into MongoDB adminUsers collection.
 * Run from repo root:
 *   node frontend/scripts/seed-platform-users.mjs
 *
 * Requires MongoDB at DB_URL (default mongodb://127.0.0.1:27017)
 * and bcrypt from backend/node_modules.
 */

import { createRequire } from "module"
import path from "path"
import { fileURLToPath } from "url"
import { readFileSync } from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")
const require = createRequire(path.join(root, "backend/package.json"))

const bcrypt = require("bcrypt")
const { MongoClient } = require("mongodb")

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.join(root, "backend", name), "utf8")
      for (const line of text.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim()
        if (!process.env[key]) process.env[key] = value
      }
    } catch {
      // optional
    }
  }
}

loadEnv()

const PASSWORD = "Wati@123"

const USERS = [
  { userId: "USR-CLARE-0001", email: "ava.chen@clare.ai", role: "admin", name: "Ava Chen" },
  { userId: "USR-CLARE-0002", email: "ben.ortiz@clare.ai", role: "operator", name: "Ben Ortiz" },
  { userId: "USR-CLARE-0003", email: "chloe.patel@clare.ai", role: "readonly", name: "Chloe Patel" },
  { userId: "USR-CLARE-0004", email: "diego.morales@clare.ai", role: "engineer", name: "Diego Morales" },
  { userId: "USR-CLARE-0005", email: "elena.rossi@clare.ai", role: "admin", name: "Elena Rossi" },
  { userId: "USR-CLARE-0006", email: "farah.khan@clare.ai", role: "operator", name: "Farah Khan" },
  { userId: "USR-CLARE-0007", email: "gabriel.okonkwo@clare.ai", role: "readonly", name: "Gabriel Okonkwo" },
  { userId: "USR-CLARE-0008", email: "hana.suzuki@clare.ai", role: "engineer", name: "Hana Suzuki" },
  { userId: "USR-CLARE-0009", email: "isaac.kim@clare.ai", role: "operator", name: "Isaac Kim" },
  { userId: "USR-CLARE-0010", email: "julia.santos@clare.ai", role: "admin", name: "Julia Santos" },
]

async function main() {
  const dbUrl = process.env.DB_URL ?? "mongodb://127.0.0.1:27017"
  const dbName = process.env.NEXT_PUBLIC_DB_AUTH_DATABASE ?? "wati-admin"
  const collectionName = "adminUsers"

  const client = new MongoClient(dbUrl)
  await client.connect()

  try {
    const collection = client.db(dbName).collection(collectionName)
    console.log(`Seeding ${USERS.length} users into ${dbName}.${collectionName}`)
    console.log(`Password for all: ${PASSWORD}\n`)

    for (const user of USERS) {
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(PASSWORD, salt)
      const result = await collection.updateOne(
        { email: user.email },
        {
          $set: {
            email: user.email,
            role: user.role,
            salt,
            passwordHash,
            userId: user.userId,
            name: user.name,
            someMap: {},
            someArray: [],
            someArray2: [],
          },
        },
        { upsert: true },
      )

      const action = result.upsertedCount ? "created" : "updated"
      console.log(`  ${action}: ${user.userId}  ${user.email}  (${user.role})`)
    }

    console.log("\nDone. You can sign in with any of these emails and password Wati@123")
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
