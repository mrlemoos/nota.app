// Test setup file - runs before tests
import { vi } from 'vitest'

// Set up mock environment variables for Supabase
process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock import.meta.env for browser environment
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
