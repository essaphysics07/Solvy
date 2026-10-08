import type { Subject, ExplanationLevel } from "../../shared/contracts/solution.ts";
import { SolvyError } from "./errors.ts";
export interface SolveInput {
  problem: string;
  subject: Subject;
  explanationLevel: ExplanationLevel;
  image?: { mimeType: string; data: string };
}
export async function readInput(request: Request): Promise<SolveInput> {
  const length = Number(request.headers.get("content-length"));
  if (length > 11 * 1024 * 1024) throw new SolvyError("INVALID_REQUEST", "The upload is too large.", 413);
  let data: FormData;
  try { data = await request.formData(); }
  catch { throw new SolvyError("INVALID_REQUEST", "Send the problem as multipart form data.", 400); }
  const problem = data.get("problem");
  const image = data.get("image");
  const subject = data.get("subject") ?? "physics";
  const level = data.get("explanationLevel") ?? "step-by-step";
  if (typeof problem !== "string" || problem.length > 5000 ||
      (!problem.trim() && !(image instanceof File && image.size > 0))) {
    throw new SolvyError("INVALID_PROBLEM", "Enter a problem or choose an image. Text must be under 5,000 characters.", 400);
  }
  if (subject !== "mathematics" && subject !== "physics") throw new SolvyError("INVALID_OPTIONS", "Choose a valid subject.", 400);
  if (level !== "simple" && level !== "step-by-step" && level !== "deep-dive") throw new SolvyError("INVALID_OPTIONS", "Choose a valid explanation level.", 400);
  let attachment: SolveInput["image"];
  if (image !== null) {
    if (!(image instanceof File) || image.size === 0 || image.size > 10 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      throw new SolvyError("INVALID_IMAGE", "Choose a nonempty JPG, PNG, or WebP image under 10 MB.", 400);
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    const signatureOK = image.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      image.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
      bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!signatureOK) throw new SolvyError("INVALID_IMAGE", "The image content does not match its file type.", 400);
    attachment = { mimeType: image.type, data: bytes.toString("base64") };
  }
  return { problem: problem.trim(), subject, explanationLevel: level, ...(attachment ? { image: attachment } : {}) };
}
