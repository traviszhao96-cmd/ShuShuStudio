# Sihua Display Rules

## Purpose

The `四化` board should help the reader see structure fast, especially:

- where four-mutagen targets land
- which stars are involved
- where self-mutagen activity is happening
- how inward and outward self-mutagen behavior differs visually

## Star visibility rules

The board should not show every decorative or fortune-cycle marker by default.

Current intended visibility:

- show major stars
- also show core stars that matter directly for four-mutagen reading, including:
  - `文昌`
  - `文曲`
  - `左辅`
  - `右弼`
- hide miscellaneous stars and cycle decorations that muddy the board

## Color rules

- `禄`: green
- `权`: purple
- `科`: blue
- `忌`: red

These colors should stay stable across:

- star-level mutagen chips
- hover target highlighting
- self-mutagen outward arrows
- self-mutagen inward vectors

## Self-mutagen rules

### Outward self-mutagen

- outward self-mutagen should be attached to the actual self-mutating star, not the palace frame
- the mark should be an arrow, not a neutral short line
- the arrow should point toward the palace's outward direction

### Inward self-mutagen

- inward self-mutagen should use long vectors across the center area
- the center area should remain visually available for these vectors
- vectors should follow fixed diagonal or axis channels rather than arbitrary freeform lines

### Multi-line planning

- multiple self-mutagen vectors must not overlap into an unreadable stack
- vectors on the same lane should use parallel offsets
- geometry should be deterministic so later tuning is about aesthetics, not layout survival

## Geometry rules

- the `四化` board should be square
- the center should be a fixed inner rectangle
- inward vectors should use preplanned lanes in that square coordinate system

## Anti-noise rules

- avoid large explanation cards in the center of the board
- avoid duplicated signaling for the same concept
- prioritize structural reading over prose
