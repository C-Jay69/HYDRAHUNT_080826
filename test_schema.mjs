import z from "zod";

const interviewChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      }),
    )
    .max(200)
    .optional(),
});

// Test 1: message only, no history
const test1 = interviewChatSchema.safeParse({ message: "Hello" });
console.log("Test 1 (message only):", test1.success);

// Test 2: message + history with 2 entries
const test2 = interviewChatSchema.safeParse({
  message: "I have experience",
  history: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Question?" }
  ]
});
console.log("Test 2 (message + 2 history):", test2.success);
if (!test2.success) {
  test2.error.issues.forEach(issue => {
    console.log("  - Path: " + JSON.stringify(issue.path) + " - " + issue.message);
  });
}

// Test 3: empty message
const test3 = interviewChatSchema.safeParse({ message: "" });
console.log("Test 3 (empty message):", test3.success);
