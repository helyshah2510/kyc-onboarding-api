import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      {
        name: 'Test Person',
        email: 'person@example.com',
        password,
        phone: '9999999999',
        role: 'USER',
      },
      {
        name: 'Test Company',
        email: 'company@example.com',
        password,
        phone: '9999999998',
        role: 'USER',
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password,
        phone: '9999999990',
        role: 'ADMIN',
      },
    ],
  });
  await prisma.panProviderRecord.createMany({
    data: [
      {
        pan: 'ABCPE1234F',
        name: 'Test Person',
        phone: '9999999999',
        address: 'Test Address, Ahmedabad',
        holderType: 'individual',
      },
      {
        pan: 'XYZCC5678K',
        name: 'Test Company',
        phone: '9999999998',
        address: 'Test Company Address, Ahmedabad',
        holderType: 'company',
      },
      {
        pan: 'LMNHQ2468R',
        name: 'Test HUF',
        phone: '9999999997',
        address: 'Test HUF Address, Ahmedabad',
        holderType: 'huf',
      },
      {
        pan: 'PQRSF1357T',
        name: 'Test Firm',
        phone: '9999999996',
        address: 'Test Firm Address, Ahmedabad',
        holderType: 'firm',
      },
      {
        pan: 'ABCTA9876M',
        name: 'Test Trust',
        phone: '9999999995',
        address: 'Test Trust Address, Ahmedabad',
        holderType: 'trust',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });