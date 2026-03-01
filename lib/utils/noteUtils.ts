// lib/utils/noteUtils.ts

// Upload file to Cloudinary
export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
  );

  const resourceType = file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("audio/")
      ? "video" // Cloudinary uses 'video' for audio
      : "image";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();
  return data.secure_url;
}

// Fetch random header image from Unsplash
export async function getRandomHeaderImage(
  query: string = "nature",
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&w=1200&h=400`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`,
        },
      },
    );
    const data = await response.json();
    return data.urls.regular;
  } catch (error) {
    console.error("Error fetching header image:", error);
    return "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1200&h=400&fit=crop";
  }
}

// AI Autocompletion using Groq
export async function getAICompletion(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful writing assistant. Complete the text naturally and concisely. Only return the completion, not the original prompt.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      },
    );

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error getting AI completion:", error);
    return "";
  }
}

// /lib/utils/noteUtils.ts

/**
 * Get AI answer to a specific question with context
 */
export async function getAIAnswer(
  question: string,
  context: string,
): Promise<string> {
  try {
    const response = await fetch("/api/ai/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get AI answer");
    }

    const data = await response.json();
    return data.answer || "Unable to generate answer";
  } catch (error) {
    console.error("Error getting AI answer:", error);
    return "Error: Unable to generate answer";
  }
}
