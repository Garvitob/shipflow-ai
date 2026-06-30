import type { GatherResult, CuratedFile, CuratedContext } from "./types"
import type { CurationResult } from "./curate"

const INPUT_COST_CLIFF = 272_000
const SCAFFOLD_RESERVE = 52_000
const SINGLE_PASS_BUDGET = INPUT_COST_CLIFF - SCAFFOLD_RESERVE

const MAX_CHUNKS = 12
const MAX_TOTAL_BUDGET = SINGLE_PASS_BUDGET * MAX_CHUNKS

export function buildCuratedContext(
  gather: GatherResult,
  curation: CurationResult,
): CuratedContext {
  const { metadata, isEmpty } = gather
  const fileTree = curation.fileTree

  if (isEmpty || curation.files.length === 0) {
    return {
      metadata,
      fileTree,
      files: [],
      totalEstimatedTokens: 0,
      strategy: "single_pass",
      coverage: "full",
      excludedCount: curation.excludedCount,
      isEmpty: true,
    }
  }

  const fittable: CuratedFile[] = []
  let oversizedDropped = 0
  for (const f of curation.files) {
    if (f.estimatedTokens > SINGLE_PASS_BUDGET) {
      oversizedDropped++
      continue
    }
    fittable.push(f)
  }

  const totalTokens = fittable.reduce((sum, f) => sum + f.estimatedTokens, 0)

  if (totalTokens <= SINGLE_PASS_BUDGET) {
    return {
      metadata,
      fileTree,
      files: fittable,
      totalEstimatedTokens: totalTokens,
      strategy: "single_pass",
      coverage: "full",
      excludedCount: curation.excludedCount + oversizedDropped,
      isEmpty: false,
    }
  }

  if (totalTokens <= MAX_TOTAL_BUDGET) {
    return {
      metadata,
      fileTree,
      files: fittable,
      totalEstimatedTokens: totalTokens,
      strategy: "map_reduce",
      coverage: "full",
      excludedCount: curation.excludedCount + oversizedDropped,
      isEmpty: false,
    }
  }

  const selected: CuratedFile[] = []
  let acc = 0
  for (const f of fittable) {
    if (acc + f.estimatedTokens > MAX_TOTAL_BUDGET) break
    selected.push(f)
    acc += f.estimatedTokens
  }

  return {
    metadata,
    fileTree,
    files: selected,
    totalEstimatedTokens: acc,
    strategy: "map_reduce",
    coverage: "partial_budget",
    excludedCount:
      curation.excludedCount + oversizedDropped + (fittable.length - selected.length),
    isEmpty: false,
  }
}