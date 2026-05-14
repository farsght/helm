#!/usr/bin/env python3
"""
Phase B codemod: replace hardcoded color literals with shadcn semantic tokens
across app/ and components/ (excluding components/ui/ which are shadcn primitives).
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path("/Users/scottjensen/Projects/ai-sdr")
TARGETS = ["app", "components"]
EXCLUDE_DIRS = {"node_modules", ".next", ".git", "ui"}  # ui = shadcn primitives, leave alone

# Ordered replacement table. Order matters:
# - Compound patterns (button class strings) first
# - Then individual color tokens
# - Use word boundaries via lookarounds where needed to avoid partial matches
REPLACEMENTS = [
    # ── Primary button class clusters (handles text-white that should become primary-foreground) ──
    (r"bg-\[#266DF0\] hover:bg-\[#1a5ac9\] text-white", "bg-primary hover:bg-primary/90 text-primary-foreground"),
    (r"bg-\[#266DF0\] text-white hover:bg-\[#1a5ac9\]", "bg-primary text-primary-foreground hover:bg-primary/90"),
    (r"text-white bg-\[#266DF0\] hover:bg-\[#1a5ac9\]", "text-primary-foreground bg-primary hover:bg-primary/90"),

    # ── Brand blue ──
    (r"bg-\[#266DF0\]", "bg-primary"),
    (r"hover:bg-\[#1a5ac9\]", "hover:bg-primary/90"),
    (r"text-\[#266DF0\]", "text-primary"),
    (r"hover:text-\[#266DF0\]", "hover:text-primary"),
    (r"hover:border-\[#266DF0\]", "hover:border-primary"),
    (r"border-\[#266DF0\]", "border-primary"),
    (r"ring-\[#266DF0\]", "ring-ring"),

    # ── Surface / card / popover ──
    (r"bg-\[#25252A\]", "bg-card"),
    (r"hover:bg-\[#25252A\]", "hover:bg-card"),
    (r"bg-\[#1B1B1F\]", "bg-background"),
    (r"hover:bg-\[#1B1B1F\]", "hover:bg-background"),

    # ── Borders ──
    (r"border-\[#3A3A40\]", "border-border"),
    (r"hover:border-\[#3A3A40\]", "hover:border-border"),

    # ── Text colors ──
    # text-white: most uses are foreground-on-card. Buttons handled above already.
    (r"\btext-white\b", "text-foreground"),
    (r"\bhover:text-white\b", "hover:text-foreground"),
    (r"\btext-gray-400\b", "text-muted-foreground"),
    (r"\btext-gray-500\b", "text-muted-foreground"),
    (r"\btext-gray-300\b", "text-muted-foreground"),
    (r"\bhover:text-gray-400\b", "hover:text-muted-foreground"),
    (r"\bhover:text-gray-300\b", "hover:text-foreground"),

    # ── Status/state colors (badges, etc.) ──
    (r"bg-blue-500/10 text-blue-400", "bg-primary/10 text-primary"),
    (r"text-blue-400", "text-primary"),
]


def collect_files() -> list[Path]:
    files: list[Path] = []
    for target in TARGETS:
        base = ROOT / target
        if not base.exists():
            continue
        for p in base.rglob("*.tsx"):
            # Skip excluded dirs
            if any(part in EXCLUDE_DIRS for part in p.parts):
                continue
            files.append(p)
    return files


def apply_replacements(text: str) -> tuple[str, int]:
    total = 0
    for pattern, replacement in REPLACEMENTS:
        new_text, n = re.subn(pattern, replacement, text)
        if n:
            text = new_text
            total += n
    return text, total


def main() -> int:
    dry_run = "--apply" not in sys.argv
    files = collect_files()
    print(f"Scanning {len(files)} .tsx files in {TARGETS} (excluding {EXCLUDE_DIRS})")
    print(f"Mode: {'DRY RUN (use --apply to write)' if dry_run else 'APPLY'}\n")

    grand_total = 0
    files_changed: list[tuple[Path, int]] = []

    for path in files:
        original = path.read_text(encoding="utf-8")
        updated, count = apply_replacements(original)
        if count > 0:
            files_changed.append((path, count))
            grand_total += count
            if not dry_run:
                path.write_text(updated, encoding="utf-8")

    files_changed.sort(key=lambda x: -x[1])
    for path, count in files_changed[:30]:
        rel = path.relative_to(ROOT)
        print(f"  {count:4d}  {rel}")
    if len(files_changed) > 30:
        print(f"  ... and {len(files_changed) - 30} more files")

    print(f"\nTotal replacements: {grand_total} across {len(files_changed)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
