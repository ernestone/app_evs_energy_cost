const DEFAULT_REPO = "ernestone/app_evs_energy_cost"

export function dataUpdateRepo() {
  const configured = process.env.DATA_UPDATE_REPO?.trim()
  return configured || DEFAULT_REPO
}

export function dataUpdateTokenSet() {
  return Boolean(process.env.DATA_UPDATE_TOKEN?.trim())
}

export type WorkflowState =
  | { kind: "missing" }
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error" }

export async function workflowState(): Promise<WorkflowState> {
  const token = process.env.DATA_UPDATE_TOKEN?.trim()
  if (!token) return { kind: "missing" }
  const repo = dataUpdateRepo()
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { kind: "error" }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/update-snapshot.yml/runs?per_page=1`,
      { headers: githubHeaders(token), signal: AbortSignal.timeout(8000), cache: "no-store" },
    )
    if (!response.ok) return { kind: "error" }
    const body = (await response.json()) as { workflow_runs?: { status?: string }[] }
    const status = body.workflow_runs?.[0]?.status
    if (status === "queued" || status === "in_progress" || status === "waiting" || status === "pending") {
      return { kind: "running" }
    }
    return { kind: "idle" }
  } catch {
    return { kind: "error" }
  }
}

export async function dispatchSnapshotUpdate(): Promise<"ok" | "missing" | "error"> {
  const token = process.env.DATA_UPDATE_TOKEN?.trim()
  if (!token) return "missing"
  const repo = dataUpdateRepo()
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return "error"
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/update-snapshot.yml/dispatches`,
      {
        method: "POST",
        headers: { ...githubHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ ref: "main" }),
        signal: AbortSignal.timeout(8000),
      },
    )
    return response.ok ? "ok" : "error"
  } catch {
    return "error"
  }
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ev-cost-admin",
  }
}
