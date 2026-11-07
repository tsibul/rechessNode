import { configProblems } from '../config'

describe('configProblems', () => {
  it('accepts a proper production setup', () => {
    expect(configProblems({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40), FRONTEND_URL: 'https://rechess.ru' } as NodeJS.ProcessEnv)).toEqual([])
  })

  it('rejects weak secret and plain http in production', () => {
    const p = configProblems({ NODE_ENV: 'production', JWT_SECRET: 'change-me', FRONTEND_URL: 'http://rechess.ru' } as NodeJS.ProcessEnv)
    expect(p).toHaveLength(2)
  })

  it('does not restrict development', () => {
    expect(configProblems({ NODE_ENV: 'development', JWT_SECRET: 'x' } as NodeJS.ProcessEnv)).toEqual([])
  })
})
