import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    include: {
      tables: true,
    },
  });

  console.log("\n========================================================");
  console.log("📱 DIRECT CUSTOMER MOBILE ORDERING LINKS FOR YOUR PHONE");
  console.log("========================================================\n");

  for (const rest of restaurants) {
    console.log(`🏠 Restaurant: ${rest.name} (Slug: ${rest.slug})`);
    console.log("--------------------------------------------------------");
    for (const table of rest.tables) {
      const url = `http://192.168.1.13:3000/m/${rest.slug}?t=${table.qr_token}`;
      console.log(`  🪑 Table ${table.table_number} (Capacity: ${table.capacity})`);
      console.log(`     👉 URL: ${url}\n`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Error listing tables:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
