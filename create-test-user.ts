import { db } from "./src/lib/db";
import { hashPassword } from "./src/lib/auth";

async function createAdmin() {
  const email = "admin@example.com";
  const rawPassword = "password123";

  // Hash the password
  const passwordHash = hashPassword(rawPassword);

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