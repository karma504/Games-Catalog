import type { EmailAdapter } from 'payload'

export function buildEmail(): EmailAdapter | undefined {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return undefined
  const defaultFromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const defaultFromName = process.env.EMAIL_FROM_NAME || 'Хмарна полиця'

  return () => ({
    name: 'resend-http',
    defaultFromAddress,
    defaultFromName,
    sendEmail: async (message: any) => {
      const list = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map((x: any) => (typeof x === 'string' ? x : x.address))
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${defaultFromName} <${defaultFromAddress}>`,
          to: list(message.to),
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      })
      if (!res.ok) throw new Error(`Не вдалося надіслати лист: ${res.status} ${await res.text()}`)
      return res.json()
    },
  })
}
