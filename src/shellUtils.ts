export function quoteShellArg(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

export function getExecutableName(command: string): string {
  const firstToken = command.trim().split(/\s+/)[0] ?? "";
  const normalized = firstToken.replace(/\\/g, "/");
  return (normalized.split("/").pop() || normalized).toLowerCase();
}
