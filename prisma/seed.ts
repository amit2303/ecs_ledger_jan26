import { PrismaClient } from '../src/generated/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    try {
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
            },
        })
        console.log('User created: admin / admin123')
    } catch (e) {
        console.log('User likely already exists')
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
