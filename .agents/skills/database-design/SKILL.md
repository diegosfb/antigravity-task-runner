---
name: database-design
description: "Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases."
risk: safe
source: community
date_added: "2026-02-27"
metadata:
  version: "1.0.0"
  library: "Antigravity Awesome Skills"
  library-url: "https://github.com/sickn33/antigravity-awesome-skills"
  pack: "Software Development"
---


# Database Design

> **Learn to THINK, not copy SQL patterns.**

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

| File | Description | When to Read |
|------|-------------|--------------|
| `references/database-selection.md` | PostgreSQL vs Neon vs Turso vs SQLite | Choosing database |
| `references/orm-selection.md` | Drizzle vs Prisma vs Kysely | Choosing ORM |
| `references/schema-design.md` | Normalization, PKs, relationships | Designing schema |
| `references/indexing.md` | Index types, composite indexes | Performance tuning |
| `references/optimization.md` | N+1, EXPLAIN ANALYZE | Query optimization |
| `references/migrations.md` | Safe migrations, serverless DBs | Schema changes |

---

## ⚠️ Core Principle

- ASK user for database preferences when unclear
- Choose database/ORM based on CONTEXT
- Don't default to PostgreSQL for everything

---

## Decision Checklist

Before designing schema:

- [ ] Asked user about database preference?
- [ ] Chosen database for THIS context?
- [ ] Considered deployment environment?
- [ ] Planned index strategy?
- [ ] Defined relationship types?

---

## Anti-Patterns

❌ Default to PostgreSQL for simple apps (SQLite may suffice)
❌ Skip indexing
❌ Use SELECT * in production
❌ Store JSON when structured data is better
❌ Ignore N+1 queries

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

---

## Version Information

- **Library:** `dsfb-sdlc`
- **Description:** Diego Fernandez Brihuega Software Development Life Cycle library
- **Version:** `1.0.0`

## Version History

- **v1.0.0** (2026-05-14): Standardized version metadata for the dsfb-sdlc agents and skills library.

## Last Updated

**Date:** 2026-05-14
