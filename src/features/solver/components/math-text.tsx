import React from "react";

type MathTextProps = {
  text: string;
};

const superscriptMap: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ",
};

const subscriptMap: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "(": "₍",
  ")": "₎",
  "a": "ₐ",
  "e": "ₑ",
  "h": "ₕ",
  "i": "ᵢ",
  "j": "ⱼ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "o": "ₒ",
  "p": "ₚ",
  "r": "ᵣ",
  "s": "ₛ",
  "t": "ₜ",
  "u": "ᵤ",
  "v": "ᵥ",
  "x": "ₓ",
};

function toSuperscript(value: string) {
  return value
    .split("")
    .map((char) => superscriptMap[char] ?? char)
    .join("");
}

function toSubscript(value: string) {
  return value
    .split("")
    .map((char) => subscriptMap[char] ?? char)
    .join("");
}

export default function MathText({ text }: MathTextProps) {
  if (!text) return null;

  let formatted = text;

  // Multiplication
  formatted = formatted.replace(/\s*\*\s*/g, " × ");

  // Scientific notation:
  // 10^-7 → 10⁻⁷
  // 10^9 → 10⁹
  formatted = formatted.replace(
    /\^([+-]?\d+)/g,
    (_, exponent: string) => toSuperscript(exponent)
  );

  // General powers:
  // x^2 → x²
  // r^2 → r²
  formatted = formatted.replace(
    /([A-Za-z0-9)])\^([+-]?\d+)/g,
    (_, base: string, exponent: string) =>
      `${base}${toSuperscript(exponent)}`
  );

  // Subscripts:
  // q_1 → q₁
  // q_2 → q₂
  formatted = formatted.replace(
    /([A-Za-z])_([A-Za-z0-9]+)/g,
    (_, base: string, subscript: string) =>
      `${base}${toSubscript(subscript)}`
  );

  // Common mathematical symbols
  formatted = formatted
    .replace(/\bsqrt\(([^)]+)\)/gi, "√$1")
    .replace(/\bsqrt\s+([A-Za-z0-9]+)/gi, "√$1")
    .replace(/>=/g, "≥")
    .replace(/<=/g, "≤")
    .replace(/!=/g, "≠")
    .replace(/->/g, "→")
    .replace(/pi/g, "π");

  return (
    <span className="math-text whitespace-pre-wrap">
      {formatted}
    </span>
  );
}