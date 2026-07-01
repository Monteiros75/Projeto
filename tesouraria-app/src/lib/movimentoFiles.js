export function sanitizeFileName(name) {
  return (name || 'ficheiro').replace(/[^\w.-]/g, '_')
}

export function labelBaseDocumentType(tipo) {
  if (tipo === 'oficio') return 'Ofício'
  if (tipo === 'errata') return 'errata'
  return 'fatura'
}
