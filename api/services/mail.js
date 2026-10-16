import nodemailer from 'nodemailer'

export class MailNotConfiguredError extends Error {
  constructor() {
    super('Email is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD')
    this.name = 'MailNotConfiguredError'
  }
}

export const resolveMailCredentials = (env = process.env) => {
  const user = env.GMAIL_USER
  const pass = env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  return { user, pass, to: env.MAIL_TO || 'theoutpostgamingrgv@gmail.com' }
}

export const isMailConfigured = (env = process.env) => resolveMailCredentials(env) !== null

export const sendMail = async ({ to, subject, text, attachments }, env = process.env) => {
  const credentials = resolveMailCredentials(env)
  if (!credentials) throw new MailNotConfiguredError()

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: credentials.user, pass: credentials.pass },
  })

  await transport.sendMail({
    from: credentials.user,
    to: to || credentials.to,
    subject,
    text,
    attachments,
  })
}
