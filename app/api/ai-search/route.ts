import { NextRequest, NextResponse } from "next/server";

const HF_API_URL =
  "https://api-inference.huggingface.co/models/google/flan-t5-small";

export async function POST(request: NextRequest) {
  try {
    // Body auslesen
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const prompt = body.prompt || body.question;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt or question is required and must be a string" },
        { status: 400 }
      );
    }

    // API Token prüfen
    const HF_API_TOKEN = process.env.HF_API_TOKEN;
    if (!HF_API_TOKEN) {
      return NextResponse.json(
        { error: "Hugging Face API token missing" },
        { status: 500 }
      );
    }

    // Anfrage an Hugging Face
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 120,
          temperature: 0.7,
        },
      }),
    });

    // Fehler von HF abfangen
    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error("HuggingFace API Error:", hfResponse.status, errorText);
      return NextResponse.json(
        { error: "Hugging Face API request failed", details: errorText },
        { status: hfResponse.status }
      );
    }

    // HF Response auslesen
    const data = await hfResponse.json().catch(async () => {
      const text = await hfResponse.text();
      return { generated_text: text };
    });

    // Antwort extrahieren, egal ob Array oder Objekt
    const answer =
      (Array.isArray(data) && data[0]?.generated_text) ||
      (data?.generated_text) ||
      "Keine Antwort erhalten.";

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("HuggingFace AI error:", error);
    return NextResponse.json(
      { error: "Failed to get Hugging Face response", details: error?.message || error },
      { status: 500 }
    );
  }
}
