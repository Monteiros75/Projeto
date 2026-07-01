/**
 * Verifica se as variaveis de ambiente estao definidas (nao imprime valores).
 * Uso: node scripts/verificar-env.mjs
 * Correr a partir da pasta tesouraria-app com .env presente (vite carrega automaticamente
 * se usares dotenv — aqui lemos .env manualmente para o script CLI).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

function loadEnv() {
  if (!existsSync(envPath)) return {}
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = { ...loadEnv(), ...process.env }
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
let ok = true

console.log('Verificacao de variaveis (.env local)\n')

for (const key of required) {
  const val = env[key]
  if (!val) {
    console.log(`  [FALTA] ${key}`)
    ok = false
  } else if (!val.startsWith('http') && key.includes('URL')) {
    console.log(`  [AVISO] ${key} — valor nao parece URL`)
    ok = false
  } else {
    console.log(`  [OK]    ${key} (${val.length} caracteres)`)
  }
}

console.log('')
if (ok) {
  console.log('Pronto para npm run dev / build com Supabase configurado.')
} else {
  console.log('Copia .env.example para .env e preenche as chaves do Supabase.')
  process.exit(1)
}
