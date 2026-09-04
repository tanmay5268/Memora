import { config } from "dotenv"
import { db, postsTable } from "@repo/database";
import { usersTable } from "@repo/database";
config({ path: '.env' })
async function main() {
  const user: typeof usersTable.$inferInsert = {
    name: 'tanmay',
    age: 25,
    email: 'tan@exe.com',
  }
  const insertedUser = await db.insert(usersTable).values(user).returning();
  console.log('Inserted user: ', insertedUser[0])
  if(!insertedUser[0]) return;
  const post: typeof postsTable.$inferInsert = {
    title: 'ai',
    content: 'very good tech',
    userId: insertedUser[0]?.id,
  }
  const insertedPost = await db.insert(postsTable).values(post).returning();
  console.log('Inserted post: ', insertedPost[0])
}

main();