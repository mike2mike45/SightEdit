# Claude Code Spec-Driven Development

Kiro-style Spec Driven Development implementation using claude code slash commands, hooks and agents.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Commands: `.claude/commands/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- `feature-documentation-improvement`: 既存機能の文書化と改善計画策定
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)

## Documentation Repository (_docs/)

過去の文脈を参照し、開発効率を向上させるための知識蓄積庫

### Directory Structure

| ディレクトリ | 目的 | 記載内容 |
|---|---|---|
| `_docs/thinking/` | 設計判断や思考過程を外部化 | 迷った点、却下した案、判断理由などを箇条書きする。Claude が設計方針を理解しやすい形に |
| `_docs/features/` | 新機能の追加・改修の目的 | 実装目的、画面構成、データ構造、リスク、完了条件などを簡潔にまとめる |
| `_docs/deleted/` | 削除・廃止した機能やファイルの履歴 | 削除理由、影響範囲、代替手段、再発防止策を記録する |

### Usage Guidelines

1. **思考ログの記録** (`_docs/thinking/`)
   - 重要な技術選定時に記録
   - アーキテクチャ変更の判断理由を明記
   - 却下した案とその理由も含める

2. **機能ドキュメント** (`_docs/features/`)
   - 新機能実装前に作成
   - 実装中に随時更新
   - 完了後も参照ドキュメントとして保持

3. **削除履歴** (`_docs/deleted/`)
   - 機能削除時に必ず記録
   - 影響範囲と代替手段を明記
   - 同じ問題の再発防止に活用

詳細は各ディレクトリの README.md を参照してください。

## Workflow

### Phase 0: Steering (Optional)
`/kiro:steering` - Create/update steering documents
`/kiro:steering-custom` - Create custom steering for specialized contexts

Note: Optional for new features or small additions. You can proceed directly to spec-init.

### Phase 1: Specification Creation
1. `/kiro:spec-init [detailed description]` - Initialize spec with detailed project description
2. `/kiro:spec-requirements [feature]` - Generate requirements document
3. `/kiro:spec-design [feature]` - Interactive: "Have you reviewed requirements.md? [y/N]"
4. `/kiro:spec-tasks [feature]` - Interactive: Confirms both requirements and design review

### Phase 2: Progress Tracking
`/kiro:spec-status [feature]` - Check current progress and phases

## Development Rules
1. **Consider steering**: Run `/kiro:steering` before major development (optional for new features)
2. **Follow 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Approval required**: Each phase requires human review (interactive prompt or manual)
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/kiro:steering` after significant changes
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment

## Steering Configuration

### Current Steering Files
Managed by `/kiro:steering` command. Updates here reflect command changes.

### Active Steering Files
- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files
<!-- Added by /kiro:steering-custom command -->
<!-- Format:
- `filename.md`: Mode - Pattern(s) - Description
  Mode: Always|Conditional|Manual
  Pattern: File patterns for Conditional mode
-->

### Inclusion Modes
- **Always**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., "*.test.js")
- **Manual**: Reference with `@filename.md` syntax

