import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

// ============================================================
// TYPES
// ============================================================

type SolutionStep = {
  title: string;
  explanation: string;
  expression: string;
};

type Solution = {
  title: string;
  steps: SolutionStep[];
  answer: string;
  note: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const MAX_PROBLEM_LENGTH = 5000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const VALID_SUBJECTS = ["mathematics", "physics"];
const VALID_LEVELS = ["simple", "step-by-step", "deep-dive"];

// ============================================================
// SOLUTION SCHEMA
// ============================================================

const solutionSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
    },

    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },

          explanation: {
            type: "string",
          },

          expression: {
            type: "string",
          },
        },

        required: ["title", "explanation", "expression"],
      },
    },

    answer: {
      type: "string",
    },

    note: {
      type: "string",
    },
  },

  required: ["title", "steps", "answer", "note"],
};

// ============================================================
// HELPER: WAIT
// ============================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// HELPER: DETECT TEMPORARY GEMINI ERRORS
// ============================================================

function isRetryableGeminiError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const lower = message.toLowerCase();

  return (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("408") ||
    lower.includes("deadline_exceeded") ||
    lower.includes("500") ||
    lower.includes("internal")
  );
}

// ============================================================
// HELPER: CLEAN GEMINI TEXT
// ============================================================

function cleanMathText(value: string): string {
  return value
    // Remove \text{...}
    .replace(/\\text\{([^{}]*)\}/g, "$1")

    // Remove \mathrm{...}
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")

    // Remove \operatorname{...}
    .replace(/\\operatorname\{([^{}]*)\}/g, "$1")

    // Replace LaTeX spacing commands
    .replace(/\\quad/g, " ")
    .replace(/\\qquad/g, " ")
    .replace(/\\,/g, " ")

    // Remove unnecessary LaTeX delimiters
    .replace(/^\$+|\$+$/g, "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")

    // Clean repeated spaces
    .replace(/\s+/g, " ")

    .trim();
}

// ============================================================
// HELPER: NORMALIZE SOLUTION
// ============================================================

function normalizeSolution(solution: Solution): Solution {
  return {
    title: cleanMathText(solution.title),

    steps: Array.isArray(solution.steps)
      ? solution.steps.map((step) => ({
          title: cleanMathText(step.title),
          explanation: cleanMathText(step.explanation),
          expression: cleanMathText(step.expression),
        }))
      : [],

    answer: cleanMathText(solution.answer),
    note: cleanMathText(solution.note),
  };
}

// ============================================================
// HELPER: CALL GEMINI WITH RETRY
// ============================================================

async function generateWithGemini(
  ai: GoogleGenAI,
  model: string,
  contents: any[]
) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Gemini request: ${model} | attempt ${attempt}/${maxAttempts}`
      );

      const response = await ai.models.generateContent({
        model,
        contents,

        config: {
          responseMimeType: "application/json",
          responseSchema: solutionSchema,
        },
      });

      return response;
    } catch (error) {
      console.error(
        `Gemini error (${model}, attempt ${attempt}):`,
        error
      );

      // Do NOT retry permanent errors such as:
      // invalid API key
      // malformed request
      // permission problems
      if (!isRetryableGeminiError(error)) {
        throw error;
      }

      // If this was the final attempt, throw the error
      if (attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff:
      // attempt 1 -> 1000 ms
      // attempt 2 -> no retry
      const delay = 1000 * Math.pow(2, attempt - 1);

      console.log(
        `Temporary Gemini error. Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw new Error("Gemini request failed.");
}

// ============================================================
// POST /api/solve
// ============================================================

export async function POST(request: Request) {
  try {
    // ========================================================
    // READ FORM DATA
    // ========================================================

    const data = await request.formData();

    const problem = data.get("problem");
    const image = data.get("image");

    const subject = String(
      data.get("subject") ?? "physics"
    );

    const explanationLevel = String(
      data.get("explanationLevel") ?? "step-by-step"
    );

    // ========================================================
    // VALIDATE PROBLEM
    // ========================================================

    if (
      typeof problem !== "string" ||
      problem.length > MAX_PROBLEM_LENGTH ||
      (!problem.trim() &&
        !(image instanceof File && image.size > 0))
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PROBLEM",
          message:
            "Enter a problem or choose an image. Text must be under 5,000 characters.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VALIDATE SUBJECT / EXPLANATION LEVEL
    // ========================================================

    if (
      !VALID_SUBJECTS.includes(subject) ||
      !VALID_LEVELS.includes(explanationLevel)
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_OPTIONS",
          message:
            "Please choose a valid subject and explanation level.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VALIDATE IMAGE
    // ========================================================

    if (image !== null) {
      if (
        !(image instanceof File) ||
        image.size > MAX_IMAGE_SIZE ||
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(image.type)
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_IMAGE",
            message:
              "Choose a JPG, PNG, or WebP image under 10 MB.",
          },
          { status: 400 }
        );
      }
    }

    // ========================================================
    // GEMINI API KEY
    // ========================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_NOT_CONFIGURED",
          message:
            "Gemini API key is missing. Add GEMINI_API_KEY to .env.local.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // CREATE GEMINI CLIENT
    // ========================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    // ========================================================
    // BUILD PROMPT
    // ========================================================

    const instructions = `
You are Solvy, an expert educational AI tutor.

Subject: ${subject}
Explanation level: ${explanationLevel}

Solve the student's problem accurately and pedagogically.

IMPORTANT RULES:

1. Solve the problem step by step.
2. Do not invent missing information.
3. Identify the important given quantities.
4. Explain the relevant formula before using it.
5. Substitute values clearly.
6. Show the calculation.
7. Give a clear final answer.
8. For physics:
   - Include correct SI units.
   - Explain the physical meaning of important quantities.
   - Use the correct physics equation.
9. For mathematics:
   - Show the algebra clearly.
   - Do not skip important algebraic steps.
10. Keep the explanation appropriate for a student.
11. If an image is provided, carefully read the problem from it.
12. If the image is unclear, state what is unclear instead of guessing.

IMPORTANT OUTPUT FORMATTING:

- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT use code fences.
- Do NOT include commentary outside the JSON.
- Mathematical expressions must be readable as plain text or simple LaTeX.
- Do NOT use \\text{} inside expressions.
- Do NOT put units inside \\text{}.
- Write units normally:
  m/s
  m/s²
  N
  J
  kg
- Keep expressions concise and readable.

The JSON must contain:
- title
- steps
- answer
- note

Each step must contain:
- title
- explanation
- expression
`;

    // ========================================================
    // USER PROBLEM
    // ========================================================

    const userText =
      typeof problem === "string" && problem.trim()
        ? problem.trim()
        : "Solve the problem shown in the attached image.";

    // ========================================================
    // BUILD GEMINI CONTENT
    // ========================================================

    const contents: any[] = [
      {
        text: `${instructions}

Student's problem:

${userText}`,
      },
    ];

    // ========================================================
    // ADD IMAGE IF PROVIDED
    // ========================================================

    if (
      image instanceof File &&
      image.size > 0
    ) {
      const arrayBuffer =
        await image.arrayBuffer();

      const base64 =
        Buffer.from(arrayBuffer).toString("base64");

      contents.push({
        inlineData: {
          mimeType: image.type,
          data: base64,
        },
      });
    }

    // ========================================================
    // GEMINI GENERATION
    // ========================================================

    let response;

    try {
      // ------------------------------------------------------
      // PRIMARY MODEL
      // Gemini 3.8 Flash
      // ------------------------------------------------------

      response = await generateWithGemini(
        ai,
        "gemini-3.8-flash",
        contents
      );
    } catch (primaryError) {
      console.error(
        "Gemini 3.8 Flash failed:",
        primaryError
      );

      // ------------------------------------------------------
      // FALLBACK MODEL
      // Gemini 3.7 Flash
      // ------------------------------------------------------

      if (isRetryableGeminiError(primaryError)) {
        console.log(
          "Trying fallback model: gemini-3.7-flash"
        );

        await sleep(1000);

        response = await generateWithGemini(
          ai,
          "gemini-3.7-flash",
          contents
        );
      } else {
        throw primaryError;
      }
    }

    // ========================================================
    // READ GEMINI RESPONSE
    // ========================================================

    const rawText =
      response.text?.trim();

    if (!rawText) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    console.log(
      "Gemini raw response:",
      rawText
    );

    // ========================================================
    // PARSE JSON
    // ========================================================

    let solution: Solution;

    try {
      solution = JSON.parse(rawText);
    } catch (parseError) {
      console.error(
        "Gemini returned invalid JSON:",
        rawText
      );

      throw new Error(
        "Gemini returned an invalid solution format."
      );
    }

    // ========================================================
    // BASIC RESPONSE VALIDATION
    // ========================================================

    if (
      !solution ||
      typeof solution.title !== "string" ||
      !Array.isArray(solution.steps) ||
      typeof solution.answer !== "string"
    ) {
      throw new Error(
        "Gemini returned an incomplete solution."
      );
    }

    // ========================================================
    // NORMALIZE OUTPUT
    // ========================================================

    solution = normalizeSolution(solution);

    // ========================================================
    // SAVE TO SUPABASE
    // ========================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabaseResponse =
          await fetch(
            `${supabaseUrl}/rest/v1/solutions`,
            {
              method: "POST",

              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type":
                  "application/json",
                Prefer: "return=minimal",
              },

              body: JSON.stringify({
                problem: userText,
                subject,
                solution:
                  JSON.stringify(solution),
              }),
            }
          );

        if (!supabaseResponse.ok) {
          console.error(
            "Supabase returned:",
            supabaseResponse.status,
            await supabaseResponse.text()
          );
        }
      } catch (supabaseError) {
        // Supabase failure should NOT destroy
        // an otherwise successful AI response.
        console.error(
          "Supabase save error:",
          supabaseError
        );
      }
    }

    // ========================================================
    // RETURN SUCCESS
    // ========================================================

    return NextResponse.json({
      ok: true,
      solution,
      subject,
      explanationLevel,
    });
  } catch (error) {
    // ========================================================
    // FINAL ERROR HANDLER
    // ========================================================

    console.error(
      "Solve API error:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "The AI solver could not process the problem.";

    return NextResponse.json(
      {
        ok: false,
        code: "AI_ERROR",
        message: errorMessage,
      },
      { status: 502 }
    );
  }
}