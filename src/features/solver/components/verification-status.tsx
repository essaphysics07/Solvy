import type { VerificationReport } from "../../../shared/contracts/solution.ts";
const labels: Record<string, string> = {
  arithmetic: "Arithmetic", units: "Units", dimensions: "Dimensions", applicability: "Formula applicability",
  "physical-constraints": "Physical constraints", "algebra-substitution": "Original equation check", "explanation-consistency": "Explanation matches result",
};
export function VerificationStatus({ report }: { report?: VerificationReport }) {
  if (!report) return null;
  if (report.status === "UNVERIFIED") return <p className="verification-note">AI-generated solution · Not independently verified</p>;
  const passed = report.checks.filter(check => check.status === "PASS").length;
  return <details className="verification-status">
    <summary>{report.status === "VERIFIED_WITHIN_SCOPE" ? `${passed} checks passed within scope` : "Verification needs attention"}</summary>
    <p>{report.scope}</p>
    <ul>{report.checks.map(check => <li key={check.checkerId}>
      <span aria-hidden="true">{check.status === "PASS" ? "✓" : "—"}</span>{" "}
      {labels[check.checkerId] ?? check.claim}: {check.status.toLowerCase().replaceAll("_", " ")}
    </li>)}</ul>
  </details>;
}
