module.exports = {
    getSchema: () => `
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native"]
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           Int     @id @default(autoincrement())
  name         String
  email        String  @unique
  password     String
  passwordHint String?
  role         String  @default("sender")
  isSuper      Boolean @default(false)
  logs         Log[]
}

model SystemConfig {
  key   String @id
  value String
}

model Log {
  id            Int      @id @default(autoincrement())
  sentAt        DateTime @default(now())
  title         String
  message       String
  platform      String
  hasAttachment Boolean  @default(false)
  userId        Int
  user          User     @relation(fields: [userId], references: [id])
}
`
};