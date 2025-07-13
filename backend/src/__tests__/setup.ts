import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') })

// Global test setup
beforeAll(async () => {
  // Add any global setup here (e.g., database connection)
})

afterAll(async () => {
  // Add any global cleanup here
})

// Reset any mocks after each test
afterEach(() => {
  jest.clearAllMocks()
}) 