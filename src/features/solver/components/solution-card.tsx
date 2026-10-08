import { Check, Lightbulb } from "lucide-react";
import { BlockMath } from "react-katex";
import { VerificationStatus } from "./verification-status";
import type { Solution } from "../types";

import "katex/dist/katex.min.css";

function MathExpression({
  expression,
}: {
  expression: string;
}) {
  if (!expression.trim()) {
    return null;
  }

  try {
    return (
      <div className="math-expression">
        <BlockMath math={expression} renderError={() => <span>{expression}</span>} />
      </div>
    );
  } catch {
    // If Gemini returns something that KaTeX cannot parse,
    // show the original expression instead of breaking Solvy.
    return (
      <div className="math-expression">
        {expression}
      </div>
    );
  }
}

export function SolutionCard({
  solution,
  isExample = false,
}: {
  solution: Solution;
  isExample?: boolean;
}) {
  return (
    <article className="solution-card">
      <div className="solution-heading">
        <span className="tiny-label">
          {isExample ? "WORKED EXAMPLE" : "YOUR SOLUTION"}
        </span>

        {isExample && (
          <span className="example-badge">
            <Check size={13} /> Checked by substitution
          </span>
        )}
      </div>

      <h3>{solution.title}</h3>

      <ol className="solution-steps">
        {solution.steps.map((step, i) => (
          <li key={`${step.title}-${i}`}>
            <span className="step-number">{i + 1}</span>

            <div>
              <h4>{step.title}</h4>

              <p>{step.explanation}</p>

              {step.expression && (
                <MathExpression
                  expression={step.expression}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="answer">
        <span>The answer</span>

        <strong>
          {solution.answer}
        </strong>

        {(isExample || solution.verification?.status === "VERIFIED_WITHIN_SCOPE") && <Check size={20} />}
      </div>

      <VerificationStatus report={solution.verification} />

      {solution.note && (
        <p className="solution-note">
          <Lightbulb size={16} />

          {solution.note}
        </p>
      )}
    </article>
  );
}