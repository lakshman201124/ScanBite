import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Pre-hashed bcrypt passwords from seed.sql (cost 12)
// admin123 → two hashes, chef PINs 1234 / 5678
const RESTAURANT_A = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const RESTAURANT_B = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

async function seed() {
  console.log("🌱 Seeding via Supabase JS client...");

  const now = new Date().toISOString();

  const { error: rErr } = await supabase.from("restaurants").upsert(
    [
      {
        id: RESTAURANT_A,
        name: "Spice Garden",
        slug: "spice-garden",
        phone: "+919876543210",
        address: "42 MG Road, Bangalore 560001",
        plan: "growth",
        onboarded: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: RESTAURANT_B,
        name: "Biryani House",
        slug: "biryani-house",
        phone: "+919876543211",
        address: "15 Residency Road, Bangalore 560025",
        plan: "starter",
        onboarded: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    { onConflict: "slug", ignoreDuplicates: true }
  );
  if (rErr) throw new Error(`restaurants: ${rErr.message}`);
  console.log("✅ Restaurants seeded");

  const { error: uErr } = await supabase.from("users").upsert(
    [
      {
        id: "e1a1a1a1-2222-3333-4444-555555555555",
        restaurant_id: RESTAURANT_A,
        name: "Priya Sharma",
        email: "admin@spicegarden.com",
        password_hash:
          "$2b$12$SXDsCz9PDQTtzJlR4J1cu..jy3x9VAKMSYo37zLH7x287AjC52fcy",
        pin_hash: null,
        role: "admin",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "e2a2a2a2-2222-3333-4444-555555555555",
        restaurant_id: RESTAURANT_B,
        name: "Rahul Kumar",
        email: "admin@biryanihouse.com",
        password_hash:
          "$2b$12$5uR8LR8KNbAumUt5DkH8K.b0vefnNwBfCBImP.Gv57pBwo/gKoTje",
        pin_hash: null,
        role: "admin",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "e3a3a3a3-2222-3333-4444-555555555555",
        restaurant_id: RESTAURANT_A,
        name: "Arjun Chef",
        email: "chef@spicegarden.com",
        password_hash: null,
        pin_hash:
          "$2b$12$OXTfTT42jCNTWxZ6SoccTu3luaZ0fcqyIA4ofZLoV94dmhKViv7y2",
        role: "chef",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "e4a4a4a4-2222-3333-4444-555555555555",
        restaurant_id: RESTAURANT_B,
        name: "Suresh Chef",
        email: "chef@biryanihouse.com",
        password_hash: null,
        pin_hash:
          "$2b$12$TChyPnQ5Id3KUoa4A98fC.aNzFKd8wXRnnLoI.LNLc5XxZZjDL5m",
        role: "chef",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    { onConflict: "email,restaurant_id", ignoreDuplicates: true }
  );
  if (uErr) throw new Error(`users: ${uErr.message}`);
  console.log("✅ Users seeded");

  console.log("🎉 Seed complete");
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
