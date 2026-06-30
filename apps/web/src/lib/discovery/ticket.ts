export function ticketPrefix(projectName: string): string {
  const cleaned = projectName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)
  return cleaned.length > 0 ? cleaned : "REQ"
}

export function formatTicketNumber(
  projectName: string,
  ticketNumber: number | null,
): string | null {
  if (ticketNumber == null) return null
  return `${ticketPrefix(projectName)}-${String(ticketNumber).padStart(3, "0")}`
}