"""LLM-based ranking of a shortlisted set of menu items."""

import json
import logging
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)

_CANDIDATE_CAP = 30
_MIN_SCORE = 0.15

_PROMPT = """You are a restaurant menu ranking engine. Given a user's search intent and a list of menu items, rank every item by how well it fits.

Search query: "{query}"
Food intent: "{semantic_description}"
Category hint: {category_hint}

Each item below has an id, name, description, and category. Return a JSON array containing EVERY item, each with "id" (integer) and "score" (float 0.0–1.0). Order matters - most relevant first.

Items:
{items_str}

Rules:
- If the category hint is set, items OUTSIDE that category should score below 0.15 unless their name/description literally contains a synonym for that category.
- "hot" in a beverage/drink context means warm drink, not spicy - cold beverages can still score high for "hot drink" queries if they match the beverage intent.
- Words like "light", "healthy", "low calorie", or "diet" in the food intent are STRONG negative signals against items whose name or description mentions: butter, cream, creamy, cheese, ghee, rich gravy, deep-fried, crispy, slow-cooked, heavy preparation. These items should score below 0.20 regardless of other word matches.
- Conversely, items described as steamed, grilled, soup, salad, clear broth, fresh, or herb-based should score HIGHER for "light"/"healthy" queries (> 0.60).
- Words like "lunch" or "dinner" in the food intent are time-of-day hints, NOT category filters - don't force a specific category, but prefer items typically eaten at that meal. Heavier items (biryani, butter chicken, rich curries) should rank lower for "lunch" than lighter options.
- "hearty", "filling", "rich", "heavy" in the food intent should boost items with butter, cream, gravy, cheese, biryani, rich curries - the opposite of "light".
- Multiple rounds of scoring: first filter by category hint (if present), then by the food intent words, then adjust for meal-time appropriateness.
- A score of 0.0 means "completely irrelevant".

Return ONLY the JSON array - no markdown, no explanation."""


def rank_candidates(
    query: str,
    semantic_description: str,
    category_hint: str | None,
    candidates: list[Any],
    client: OpenAI | None,
) -> list[tuple[float, Any]] | None:
    """Rank candidates by LLM-judged relevance.

    Returns list of (score, item) or None on failure.
    Items scoring below _MIN_SCORE are excluded.
    """

    if not candidates:
        return []
    if len(candidates) == 1:
        return [(0.5, candidates[0])]

    if client is None:
        logger.warning("LLM client unavailable - skipping ranking")
        return None

    shortlist = candidates[:_CANDIDATE_CAP]
    lines = []
    for item in shortlist:
        desc = (item.description or "")[:100]
        lines.append(f"  {item.id}: {item.name} - {desc} - category: {item.category}")
    items_str = "\n".join(lines)

    prompt = _PROMPT.format(
        query=query,
        semantic_description=semantic_description or query,
        category_hint=f'"{category_hint}"' if category_hint else "none",
        items_str=items_str,
    )

    try:
        resp = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0,
        )
        text = resp.choices[0].message.content.strip() if resp.choices else ""
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            if text.endswith("```"):
                text = text[:-3]

        parsed = json.loads(text)
        if not isinstance(parsed, list):
            raise ValueError(f"expected JSON array, got {type(parsed).__name__}")

        item_map = {item.id: item for item in shortlist}
        seen: set[int] = set()
        ranked: list[tuple[float, Any]] = []

        for entry in parsed:
            item_id = entry.get("id")
            if item_id is None or item_id not in item_map:
                continue
            seen.add(item_id)
            score = max(0.0, min(float(entry.get("score", 0.0)), 1.0))
            if score >= _MIN_SCORE:
                ranked.append((score, item_map[item_id]))

        missing = len(shortlist) - len(seen)
        if missing > 0:
            logger.warning(
                "LLM ranking omitted %d/%d candidates - excluded from results",
                missing, len(shortlist),
            )

        return ranked
    except Exception as e:
        logger.warning("LLM ranking failed: %s - falling back to unranked", e)
        return None
