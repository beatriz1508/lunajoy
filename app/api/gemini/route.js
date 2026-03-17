import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const SYS = `You are a senior sales coach for a Brazilian company that uses Google Workspace and GHL for marketing automation. Help sales reps be sharper, more confident, and more organized. Be direct, specific, and practical. Write in the same language the user writes in.`;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYS }] },
        contents: messages,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    return new Response(JSON.stringify({ error: err.error?.message }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
}
