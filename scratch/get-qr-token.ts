import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const table = await prisma.restaurantTable.findFirst({
    where: {
      table_number: "T1",
      restaurant: { slug: "spice-garden" },
    },
    select: {
      qr_token: true,
      restaurant: { select: { slug: true } },
    },
  });
  console.log("TABLE TOKEN RESULT:", table);
}

main().finally(() => prisma.$disconnect());
