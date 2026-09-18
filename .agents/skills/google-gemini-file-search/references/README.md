# Google Gemini File Search Reference Documentation

This directory contains detailed reference materials for advanced File Search usage.

## Reference Documents

### 🚧 API reference guide (TO BE IMPLEMENTED)
Complete API documentation extracted from official sources.

**Sections:**
- FileSearchStore API (create, get, list, delete, upload, import)
- Documents API (list, get, delete, query)
- Operations API (polling pattern)
- Request/response schemas
- Error codes and handling

### 🚧 Chunking best-practices guide (TO BE IMPLEMENTED)
Detailed chunking strategies for different content types.

**Sections:**
- How chunking works (whiteSpaceConfig)
- Content type recommendations (technical docs, prose, legal, code, FAQ)
- Chunk size impact on retrieval quality
- Overlap token guidelines
- Testing and tuning chunking configs
- Examples with before/after retrieval quality

### 🚧 Pricing calculator guide (TO BE IMPLEMENTED)
Cost estimation guide with examples.

**Sections:**
- Pricing model breakdown (indexing, storage, queries)
- Token calculation methods
- Cost examples by use case (10GB KB, 100MB docs, 1TB archive)
- ROI comparison (vs Vectorize, OpenAI, manual RAG)
- Cost optimization strategies
- Free tier maximization

### 🚧 OpenAI migration guide (TO BE IMPLEMENTED)
Migration guide from OpenAI Files API.

**Sections:**
- API mapping (OpenAI → Gemini equivalents)
- Key differences (storage model, chunking, pricing)
- Migration checklist
- Code conversion examples
- Common gotchas
- When to migrate vs stay with OpenAI

## Development Status

**Completed:** 0/4 documents (0%)

**Priority:**
1. API reference guide (most frequently requested)
2. Chunking best-practices guide (critical for quality)
3. Pricing calculator guide (business decision support)
4. OpenAI migration guide (competitive alternative)

## Notes

These references supplement SKILL.md with deeper technical details for advanced users. SKILL.md provides quick-start patterns; these docs provide comprehensive knowledge.
