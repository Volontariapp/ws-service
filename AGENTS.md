<!-- gitnexus:start -->
# 🧠 GitNexus — Code Intelligence

This repository uses **GitNexus** to provide deep code understanding, impact analysis, and safe refactoring workflows. This project is indexed as **ms-event**.

> [!IMPORTANT]
> If any tool warns that the index is stale, run `npx gitnexus analyze` immediately.

## 🚀 Quick Actions

| Task | Command / Resource |
| :--- | :--- |
| **Visualize Graph** | [https://gitnexus.vercel.app/](https://gitnexus.vercel.app/) (Requires `npx gitnexus serve`) |
| **Impact Analysis** | `npx gitnexus impact <symbol>` |
| **Code Search** | `npx gitnexus query "<concept>"` |
| **Symbol Context** | `npx gitnexus context <symbol>` |

## 🛠️ Mandatory Workflows

### 1. Pre-Edit: Impact Analysis
**NEVER** modify a public function, class, or method without running impact analysis first.
*   **Action**: Run `gitnexus_impact({target: "SymbolName", direction: "upstream"})`.
*   **Rule**: Report the blast radius (direct callers, affected processes) to the user before proceeding.

### 2. Pre-Commit: Verification
**MUST** verify that your changes only affect the intended symbols.
*   **Action**: Run `gitnexus_detect_changes()`.
*   **Rule**: If unexpected files are impacted, investigate before committing.

### 3. Exploring & Refactoring
*   **Search**: Use `gitnexus_query` to find execution flows instead of grepping.
*   **Rename**: Use `gitnexus_rename` instead of find-and-replace to maintain graph integrity.

## 📊 Impact Risk Levels

| Level | Depth | Meaning | Required Action |
| :--- | :---: | :--- | :--- |
| **CRITICAL** | d=1 | Direct callers/importers will break | Update all dependents |
| **HIGH** | d=2 | Indirect dependencies likely affected | Extensive testing required |
| **LOW** | d=3+ | Transitive impacts possible | Verify critical paths |

## 🔄 Keeping the Index Fresh

After major changes or commits, refresh the knowledge graph:
```bash
npx gitnexus analyze
```
*Add `--embeddings` if you need semantic search capabilities.*

## 📖 Skill Reference

For detailed workflows, refer to the following local instruction files:
*   [Architecture Exploring](.claude/skills/gitnexus/gitnexus-exploring/SKILL.md)
*   [Impact Analysis](.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md)
*   [Debugging Flows](.claude/skills/gitnexus/gitnexus-debugging/SKILL.md)
*   [Safe Refactoring](.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md)
*   [CLI Guide & Wiki](.claude/skills/gitnexus/gitnexus-cli/SKILL.md)

<!-- gitnexus:end -->