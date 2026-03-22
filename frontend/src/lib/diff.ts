export type DiffLineKind = "added" | "removed" | "unchanged";

export type DiffLine = {
  kind: DiffLineKind;
  value: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
};

export type DiffStats = {
  added: number;
  removed: number;
  unchanged: number;
};

function splitLines(value: string) {
  return value.split("\n");
}

export function buildLineDiff(before: string, after: string): DiffLine[] {
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const table = Array.from({ length: beforeLines.length + 1 }, () =>
    Array.from({ length: afterLines.length + 1 }, () => 0),
  );

  for (let leftIndex = beforeLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (
      let rightIndex = afterLines.length - 1;
      rightIndex >= 0;
      rightIndex -= 1
    ) {
      table[leftIndex][rightIndex] =
        beforeLines[leftIndex] === afterLines[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(
              table[leftIndex + 1][rightIndex],
              table[leftIndex][rightIndex + 1],
            );
    }
  }

  const lines: DiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  let leftLineNumber = 1;
  let rightLineNumber = 1;

  while (leftIndex < beforeLines.length && rightIndex < afterLines.length) {
    if (beforeLines[leftIndex] === afterLines[rightIndex]) {
      lines.push({
        kind: "unchanged",
        value: beforeLines[leftIndex],
        leftLineNumber,
        rightLineNumber,
      });
      leftIndex += 1;
      rightIndex += 1;
      leftLineNumber += 1;
      rightLineNumber += 1;
      continue;
    }

    if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      lines.push({
        kind: "removed",
        value: beforeLines[leftIndex],
        leftLineNumber,
      });
      leftIndex += 1;
      leftLineNumber += 1;
      continue;
    }

    lines.push({
      kind: "added",
      value: afterLines[rightIndex],
      rightLineNumber,
    });
    rightIndex += 1;
    rightLineNumber += 1;
  }

  while (leftIndex < beforeLines.length) {
    lines.push({
      kind: "removed",
      value: beforeLines[leftIndex],
      leftLineNumber,
    });
    leftIndex += 1;
    leftLineNumber += 1;
  }

  while (rightIndex < afterLines.length) {
    lines.push({
      kind: "added",
      value: afterLines[rightIndex],
      rightLineNumber,
    });
    rightIndex += 1;
    rightLineNumber += 1;
  }

  return lines;
}

export function getDiffStats(lines: DiffLine[]): DiffStats {
  return lines.reduce<DiffStats>(
    (stats, line) => {
      stats[line.kind] += 1;
      return stats;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
}
