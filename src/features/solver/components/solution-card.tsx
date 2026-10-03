import { Check, Lightbulb } from "lucide-react";
import type { Solution } from "../types";
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
          <li key={step.title}>
            <span className="step-number">{i + 1}</span>
            <div>
              <h4>{step.title}</h4>
              <p>{step.explanation}</p>
              {step.expression && (
                <div className="math-expression">{step.expression}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="answer">
        <span>The answer</span>
        <strong>{solution.answer}</strong>
        <Check size={20} />
      </div>
      {solution.note && (
        <p className="solution-note">
          <Lightbulb size={16} />
          {solution.note}
        </p>
      )}
    </article>
  );
}
