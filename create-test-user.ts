import { db } from "./src/lib/db";
import bcrypt from "bcryptjs"; // or "bcrypt" depending on what package you use

async function createAdmin() {
  const email = "admin@example.com";
  const rawPassword = "password123";

  // Hash the password (standard bcrypt salt)
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Upsert user (creates if doesn't exist, updates password if exists)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Admin User",
      passwordHash,
    },
  });

  console.log("✅ User created/updated successfully!");
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${rawPassword}`);
}

createAdmin()
  .catch((e) => console.error("Error creating user:", e))
  .finally(() => process.exit(0));