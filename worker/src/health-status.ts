/** HTTP health: UP when status code is 1–499, DOWN for 5xx or unreachable (0). */
export function isHttpUp(statusCode: number): boolean {
  return statusCode > 0 && statusCode < 500;
}

export function deriveCheckStatus(statusCode: number): "UP" | "DOWN" {
  return isHttpUp(statusCode) ? "UP" : "DOWN";
}
