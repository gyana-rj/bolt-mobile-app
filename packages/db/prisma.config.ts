import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrate: {
    adapter: async () => {
      return new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    },
  },
})