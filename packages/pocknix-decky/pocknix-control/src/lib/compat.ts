// Per-game Proton selection via SteamClient.Apps. This drives the SAME state as Steam's own
// per-game compatibility dropdown (SpecifyCompatTool + app details), so the two UIs stay in
// sync by construction — we never store a shadow copy.

export interface CompatTool {
  name: string;
  label: string;
}

export async function availableCompatTools(appid: string): Promise<CompatTool[]> {
  const apps = window.SteamClient?.Apps;
  if (!apps?.GetAvailableCompatTools) return [];
  try {
    const tools = await apps.GetAvailableCompatTools(Number(appid));
    if (!Array.isArray(tools)) return [];
    return tools
      .map((tool: any) => ({
        name: String(tool?.strToolName ?? ""),
        label: String(tool?.strDisplayName ?? tool?.strToolName ?? ""),
      }))
      .filter((tool) => tool.name);
  } catch {
    return [];
  }
}

/** Live view of the game's current tool; fires again when it changes anywhere (incl. Steam's UI). */
export function registerForCompatTool(appid: string, onChange: (tool: string) => void): () => void {
  const apps = window.SteamClient?.Apps;
  if (!apps?.RegisterForAppDetails) return () => {};
  const registration = apps.RegisterForAppDetails(Number(appid), (details: any) => {
    onChange(String(details?.strCompatToolName ?? ""));
  });
  return () => registration?.unregister?.();
}

export function setCompatTool(appid: string, tool: string): void {
  window.SteamClient?.Apps?.SpecifyCompatTool?.(Number(appid), tool);
}
