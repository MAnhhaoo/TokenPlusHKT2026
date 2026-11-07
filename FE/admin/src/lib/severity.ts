import type { Severity } from "@/types"

export function severityLabel(severity: Severity) {
  return severity === "critical"
    ? "Nghiêm trọng"
    : severity === "high"
      ? "Cao"
      : "Trung bình"
}

