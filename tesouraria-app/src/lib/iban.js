export function normalizeIban(value) {
  return (value || '').replace(/\s+/g, '').toUpperCase()
}

export function formatIban(value) {
  return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim()
}

export function isValidIban(value) {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString())

  let remainder = 0
  for (let i = 0; i < numeric.length; i += 1) {
    remainder = (remainder * 10 + Number(numeric[i])) % 97
  }
  return remainder === 1
}
