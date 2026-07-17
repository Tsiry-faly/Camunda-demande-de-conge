export const DEPARTEMENTS = [
  { value: 'si', label: 'Service informatiques' },
  { value: 'rh', label: 'Ressources Humaines' },
  { value: 'fc', label: 'Finance / Comptabilité' },
  { value: 'mc', label: 'Marketing / Communication' },
  { value: 'po', label: 'Production / Opérations' },
]

const LABEL_BY_CODE = Object.fromEntries(DEPARTEMENTS.map((d) => [d.value, d.label]))

export function departementLabel(code) {
  return LABEL_BY_CODE[code] || code
}