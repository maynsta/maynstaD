import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question, songTitle, artistName } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const HF_API_TOKEN = process.env.HF_API_TOKEN;
    if (!HF_API_TOKEN) {
      return NextResponse.json({ error: "Hugging Face API token missing" }, { status: 500 });
    }

    const contextMessage = songTitle
      ? `Der Nutzer fragt über den Song "${songTitle}"${artistName ? ` von ${artistName}` : ""}. `
      : "";

    const MODEL = "mistralai/Mistral-7B-Instruct-v0.1"; // funktioniert sicher

    const response = await fetch(`https://router.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Du bist ein hilfreicher Musik-Assistent für Maynsta, eine Musik-Streaming-Plattform. Beantworte Fragen über Musik, Songs, Künstler und Alben auf Deutsch. Halte die Antworten kurz (max. 2-3 Sätze).\n${contextMessage}${question}`,
        parameters: { max_new_tokens: 150, return_full_text: false },
      }),
    });

    // Nur einmal lesen
    const text = await response.text();
    let answer = "Keine Antwort erhalten.";

    try {
      const data = JSON.parse(text); // Versuche JSON
      if (Array.isArray(data) && data[0]?.generated_text) {
        answer = data[0].generated_text;
      } else if (data?.generated_text) {
        answer = data.generated_text;
      } else if (data?.error) {
        answer = `Fehler vom HF-Server: ${data.error}`;
      }
    } catch {
      // Kein JSON → Plain Text
      answer = text;
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("HF AI Search error:", error);
    return NextResponse.json(
      { error: "Failed to get HF AI response" },
      { status: 500 }
    );
  }
}

