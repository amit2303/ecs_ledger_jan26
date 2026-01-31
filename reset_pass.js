const { PrismaClient } = require('./src/generated/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log("Resetting admin password...")
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: hashedPassword },
        create: {
            username: 'admin',
            password: hashedPassword,
        },
    })
    console.log("SUCCESS: Password is now 'admin123'")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
