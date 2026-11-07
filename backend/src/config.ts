/**
 * Start-up checks of the environment. A wrong production setup stops the server instead of
 * silently running with test behaviour (stub payments, cookies without Secure).
 * @module config
 */

/** Returns the problems of the current environment; empty list means fine. */
export function configProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = []
  const secret = env.JWT_SECRET ?? ''
  if (env.NODE_ENV === 'production') {
    if (secret.length < 32 || secret === 'change-me') problems.push('JWT_SECRET must be a random string of at least 32 characters')
    if (!env.FRONTEND_URL) problems.push('FRONTEND_URL is not set')
    else if (!/^https:\/\//.test(env.FRONTEND_URL)) problems.push('FRONTEND_URL must be an https address')
  }
  return problems
}

/** Throws in production on a bad setup; elsewhere only warns when NODE_ENV is missing. */
export function assertConfig(env: NodeJS.ProcessEnv = process.env): void {
  const problems = configProblems(env)
  if (problems.length) throw new Error(`Bad configuration: ${problems.join('; ')}`)
  if (!env.NODE_ENV) console.warn('NODE_ENV is not set: the server runs in development mode (stub payments, cookies without Secure)')
}
