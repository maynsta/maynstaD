// app/api/openai-new/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.question;

    console.log("Request body:", body);
    console.log("Prompt extracted:", prompt);
    console.log("OPENAI_API_KEY is set:", !!process.env.OPENAI_API_KEY);

    if (!prompt || prompt.trim() === "") {
      console.warn("Empty prompt received!");
      return NextResponse.json(
        { error: "Prompt or question is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY missing!");
      return NextResponse.json(
        { error: "OpenAI API key missing" },
        { status: 500 }
      );
    }

    // AI-Anfrage
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Bei Problemen teste: "gpt-3.5-turbo"
      messages: [{ role: "user", content: prompt }],
      // max_tokens kann weggelassen werden
    });

    console.log("OpenAI raw response:", JSON.stringify(completion, null, 2));

    const answer = completion.choices?.[0]?.message?.content?.trim() || null;

    if (!answer) {
      console.error("Keine Antwort von OpenAI erhalten!");
      return NextResponse.json(
        { error: "Keine Antwort von OpenAI erhalten" },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("OpenAI API Fehler:", err);

    // Spezielle Behandlung für Quota / 429
    if (err.code === "insufficient_quota" || err.status === 429) {
      return NextResponse.json(
        { error: "OpenAI Quota überschritten. Bitte Plan prüfen." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Fehler beim Abrufen der OpenAI-Antwort" },
      { status: 500 }
    );
  }
}

