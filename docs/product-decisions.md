# Product Decisions

## Core workspace model

- The app is one unified workspace, not three separate apps.
- The main stage supports three modes:
  - `三合`
  - `四化`
  - `八字`
- The mode switch belongs inside the stage header as a light internal tab group.

## Case management

- The top header is a case management strip, not a marketing hero section.
- The expanded case browser is a product surface for switching among cases.
- Case editing can update:
  - name
  - birth time
  - group
- Local edits should be writable back into the local database.

## Right sidebar

- Old summary blocks like “核心摘要” and “前4宫速览” are not the future direction.
- The right sidebar should eventually become a skill-driven analysis surface.
- Short-term use is allowed for focused analysis blocks such as risk palaces in `四化` mode.

## Four-mutagen board

- `四化` should have its own dedicated board, not just a generic chart plus explanatory cards.
- The board should prioritize visual structure over long textual explanation.
- The center of the board should stay clear for structural vector language.
- The board should use standard mutagen color semantics:
  - `禄`: green
  - `权`: purple
  - `科`: blue
  - `忌`: red

## Knowledge management

- GitHub is the primary cloud memory for this project.
- Stable project memory belongs in versioned markdown files inside the repo.
- Skills should be treated as method assets, but project context should not live only inside skills.
