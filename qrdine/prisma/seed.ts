import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const restaurantAId = uuidv4();
  const restaurantBId = uuidv4();

  const restaurantA = await prisma.restaurant.upsert({
    where: { slug: "spice-garden" },
    update: {},
    create: {
      id: restaurantAId,
      name: "Spice Garden",
      slug: "spice-garden",
      phone: "+919876543210",
      address: "42 MG Road, Bangalore – 560001",
      plan: "growth",
      onboarded: true,
    },
  });

  const restaurantB = await prisma.restaurant.upsert({
    where: { slug: "biryani-house" },
    update: {},
    create: {
      id: restaurantBId,
      name: "Biryani House",
      slug: "biryani-house",
      phone: "+919876543211",
      address: "15 Residency Road, Bangalore – 560025",
      plan: "starter",
      onboarded: true,
    },
  });

  console.log("✅ Restaurants:", restaurantA.name, "+", restaurantB.name);

  const adminAHash = await bcrypt.hash("admin123", 12);
  const adminBHash = await bcrypt.hash("admin123", 12);
  const chefPinHashA = await bcrypt.hash("1234", 12);
  const chefPinHashB = await bcrypt.hash("5678", 12);

  await prisma.user.upsert({
    where: { email_restaurant_id: { email: "admin@spicegarden.com", restaurant_id: restaurantA.id } },
    update: {},
    create: {
      restaurant_id: restaurantA.id,
      name: "Priya Sharma",
      email: "admin@spicegarden.com",
      password_hash: adminAHash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email_restaurant_id: { email: "admin@biryanihouse.com", restaurant_id: restaurantB.id } },
    update: {},
    create: {
      restaurant_id: restaurantB.id,
      name: "Rahul Kumar",
      email: "admin@biryanihouse.com",
      password_hash: adminBHash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email_restaurant_id: { email: "chef@spicegarden.com", restaurant_id: restaurantA.id } },
    update: {},
    create: {
      restaurant_id: restaurantA.id,
      name: "Arjun Chef",
      email: "chef@spicegarden.com",
      pin_hash: chefPinHashA,
      role: "chef",
    },
  });

  await prisma.user.upsert({
    where: { email_restaurant_id: { email: "chef@biryanihouse.com", restaurant_id: restaurantB.id } },
    update: {},
    create: {
      restaurant_id: restaurantB.id,
      name: "Suresh Chef",
      email: "chef@biryanihouse.com",
      pin_hash: chefPinHashB,
      role: "chef",
    },
  });

  console.log("✅ Users seeded");

  for (const restaurantId of [restaurantA.id, restaurantB.id]) {
    for (let i = 1; i <= 3; i++) {
      await prisma.restaurantTable.upsert({
        where: {
          restaurant_id_table_number: {
            restaurant_id: restaurantId,
            table_number: `T${i}`,
          },
        },
        update: {},
        create: {
          restaurant_id: restaurantId,
          table_number: `T${i}`,
          capacity: i === 1 ? 2 : i === 2 ? 4 : 6,
          qr_token: uuidv4(),
        },
      });
    }
  }

  console.log("✅ Tables seeded (3 per restaurant)");

  const categoriesA = [
    { name: "Starters", sort_order: 1 },
    { name: "Main Course", sort_order: 2 },
    { name: "Beverages", sort_order: 3 },
  ];

  for (const cat of categoriesA) {
    const category = await prisma.menuCategory.create({
      data: { restaurant_id: restaurantA.id, ...cat },
    });

    const items =
      cat.name === "Starters"
        ? [
            { name: "Paneer Tikka", price: 280, food_type: "veg" as const },
            { name: "Chicken 65", price: 320, food_type: "non_veg" as const },
            { name: "Veg Spring Roll", price: 200, food_type: "veg" as const },
            { name: "Fish Pakora", price: 350, food_type: "non_veg" as const },
            { name: "Samosa Chaat", price: 150, food_type: "veg" as const },
          ]
        : cat.name === "Main Course"
        ? [
            { name: "Butter Chicken", price: 380, food_type: "non_veg" as const },
            { name: "Dal Makhani", price: 260, food_type: "veg" as const },
            { name: "Palak Paneer", price: 300, food_type: "veg" as const },
            { name: "Chicken Biryani", price: 420, food_type: "non_veg" as const },
            { name: "Veg Biryani", price: 320, food_type: "veg" as const },
          ]
        : [
            { name: "Masala Chai", price: 60, food_type: "veg" as const },
            { name: "Fresh Lime Soda", price: 80, food_type: "veg" as const },
            { name: "Mango Lassi", price: 120, food_type: "veg" as const },
            { name: "Cold Coffee", price: 150, food_type: "veg" as const },
            { name: "Mineral Water", price: 30, food_type: "veg" as const },
          ];

    for (let i = 0; i < items.length; i++) {
      await prisma.menuItem.create({
        data: {
          restaurant_id: restaurantA.id,
          category_id: category.id,
          name: items[i].name,
          price: items[i].price,
          food_type: items[i].food_type,
          sort_order: i + 1,
          prep_time_minutes: 15,
        },
      });
    }
  }

  console.log("✅ Menu seeded for Spice Garden");

  console.log("\n📋 Test credentials:");
  console.log("─────────────────────────────────────────");
  console.log("Restaurant A — Spice Garden");
  console.log("  Admin: admin@spicegarden.com / admin123");
  console.log("  Chef PIN: 1234 (slug: spice-garden)");
  console.log("─────────────────────────────────────────");
  console.log("Restaurant B — Biryani House");
  console.log("  Admin: admin@biryanihouse.com / admin123");
  console.log("  Chef PIN: 5678 (slug: biryani-house)");
  console.log("─────────────────────────────────────────");
  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
