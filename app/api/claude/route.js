import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYS = `You are a senior sales coach for a Brazilian company that uses Google Workspace and GHL for marketing automation. Help sales reps be sharper, more confident, and more organized. Be direct, specific, and practical. Use numbered lists or bullet points where helpful. Never give generic advice — always make outputs actionable and context-specific. Write in the same language the user writes in.`;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { prompt } = await req.json();
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: SYS,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta?.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\nError: ${e.message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
