export const AGE_CHOICES = ['0+', '3+', '6+', '7+', '12+', '16+', '18+'] as const
export const ADULT_AGE = 18

export function calculateAge(birth?: string | Date | null, today: Date = new Date()): number | null {
  if (!birth) return null
  const b = new Date(birth)
  if (Number.isNaN(b.getTime())) return null
  let years = today.getUTCFullYear() - b.getUTCFullYear()
  const beforeBirthday =
    today.getUTCMonth() < b.getUTCMonth() ||
    (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate())
  if (beforeBirthday) years -= 1
  return Math.max(years, 0)
}

export const ratingToInt = (code: string): number | null => {
  const n = parseInt(code, 10)
  return Number.isFinite(n) ? n : null
}

export function allowedRatings(age: number | null): string[] {
  if (age === null) return [...AGE_CHOICES]
  return AGE_CHOICES.filter((c) => (ratingToInt(c) ?? 999) <= age)
}

export const canSeeUnrated = (age: number | null) => age === null || age >= ADULT_AGE

export async function getSiteSettings(payload: any): Promise<any> {
  try {
    return await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
  } catch {
    return {}
  }
}

export async function ageFor(req: any): Promise<number | null> {
  const own = calculateAge(req.user?.dateOfBirth)
  if (own !== null) return own
  const s = await getSiteSettings(req.payload)
  return typeof s.guestAgeLimit === 'number' ? Math.max(s.guestAgeLimit, 0) : null
}
