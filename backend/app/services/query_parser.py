"""Natural language query parser - LLM primary, regex keyword fallback.

Extracts structured filters + category_hint + semantic_description from a
free-text food search query.
"""

import json
import logging
import os
import re
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

logger = logging.getLogger(__name__)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

_openai_client: OpenAI | None = None


def _get_llm_client() -> OpenAI | None:
    global _openai_client
    if _openai_client is None and DEEPSEEK_API_KEY:
        _openai_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
    return _openai_client


# Known menu categories - passed into the LLM prompt so category_hint maps to
# something real. Extend this list if new categories are added to the menu.
# Must match the actual category strings in the database exactly.
# Use SELECT DISTINCT category FROM menu_items to verify.
_KNOWN_CATEGORIES = [
    "Starters", "Main Course", "Breads", "Rice",
    "Soups", "South Indian", "Dessert", "Beverages",
]


def _llm_parse(query: str) -> dict[str, Any] | None:
    client = _get_llm_client()
    if client is None:
        return None

    cats = ", ".join(_KNOWN_CATEGORIES)

    examples = [
        ('"a light lunch not fried"',
         '{"max_price":null,"min_price":null,"is_vegetarian":null,"is_spicy":null,"cooking_method_include":[],"cooking_method_exclude":["fried"],"category_hint":null,"semantic_description":"light lunch"}'),
        ('"spicy veg noodles under 200"',
         '{"max_price":200,"min_price":null,"is_vegetarian":true,"is_spicy":true,"cooking_method_include":[],"cooking_method_exclude":[],"category_hint":"Rice","semantic_description":"noodles"}'),
        ('"something sweet"',
         '{"max_price":null,"min_price":null,"is_vegetarian":null,"is_spicy":null,"cooking_method_include":[],"cooking_method_exclude":[],"category_hint":"Dessert","semantic_description":"sweet"}'),
        ('"hot beverage"',
         '{"max_price":null,"min_price":null,"is_vegetarian":null,"is_spicy":null,"cooking_method_include":[],"cooking_method_exclude":[],"category_hint":"Beverages","semantic_description":"hot drink"}'),
        ('"something to drink"',
         '{"max_price":null,"min_price":null,"is_vegetarian":null,"is_spicy":null,"cooking_method_include":[],"cooking_method_exclude":[],"category_hint":"Beverages","semantic_description":"drink"}'),
        ('"spicy vegetarian starter under 200"',
         '{"max_price":200,"min_price":null,"is_vegetarian":true,"is_spicy":true,"cooking_method_include":[],"cooking_method_exclude":[],"category_hint":"Starters","semantic_description":"spicy vegetarian starter"}'),
        ('"grilled chicken"',
         '{"max_price":null,"min_price":null,"is_vegetarian":false,"is_spicy":null,"cooking_method_include":["grilled"],"cooking_method_exclude":[],"category_hint":null,"semantic_description":"grilled chicken"}'),
    ]
    example_lines = "\n".join("  %s -> %s" % (q, j) for q, j in examples)

    prompt = """You are a food-menu query parser. Parse the user's search into structured JSON.

The menu has these EXACT categories: [%s]

Query: "%s"

Return ONLY valid JSON - no markdown, no explanation. Keys:

- max_price: integer or null
- min_price: integer or null
- is_vegetarian: true / false / null
- is_spicy: true / false / null
- cooking_method_include: list of strings - cooking methods the user wants (valid: fried, steamed, boiled, grilled, baked, roasted, tandoori, sauteed, raw). [] if none.
- cooking_method_exclude: list of strings - cooking methods the user wants to exclude. "not fried" -> ["fried"]. [] if none.
- category_hint: string or null - which category the user seems to want. Map synonyms to the closest real menu category from the list above. Examples: "drinks"/"beverage" -> "Beverages", "sweets"/"dessert" -> "Desserts", "starters"/"appetizers"/"snack" -> "Starters", "soup" -> "Soups", "bread"/"naan"/"roti" -> "Breads", "rice"/"biryani" -> "Rice & Biryani", "breakfast"/"dosa"/"idli" -> "South Indian", "curry"/"gravy"/"meal" -> "Main Course". Only set this if you can confidently map to one of the EXACT category strings above. null if not clear.
- semantic_description: a short phrase (max 8 words) capturing the fuzzy food intent. Keep descriptive/subjective words like "light", "healthy", "hearty", "comfort", "spicy", "sweet", "tangy" - these help the ranking step. Never empty.

Rules:
- "not fried" / "without frying" -> cooking_method_exclude: ["fried"]
- "steamed", "grilled", "baked", "roasted" as a positive ask -> cooking_method_include: ["method"]
- "not spicy" / "mild" -> is_spicy: false
- "vegetarian" / "veg" -> is_vegetarian: true
- "non veg" / "meat" -> is_vegetarian: false
- "hot" in beverage/drink context is a temperature word, NOT spicy - don't set is_spicy: true for "hot drinks"/"hot beverage"

Examples:
%s""" % (cats, query, example_lines)

    try:
        resp = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=350,
            temperature=0,
        )
        text = resp.choices[0].message.content.strip() if resp.choices else ""
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            if text.endswith("```"):
                text = text[:-3]
        parsed = json.loads(text)

        result: dict[str, Any] = {}
        result["max_price"] = int(parsed["max_price"]) if parsed.get("max_price") is not None else None
        result["min_price"] = int(parsed["min_price"]) if parsed.get("min_price") is not None else None
        result["is_vegetarian"] = (
            bool(parsed["is_vegetarian"]) if parsed.get("is_vegetarian") is not None else None
        )
        result["is_spicy"] = (
            bool(parsed["is_spicy"]) if parsed.get("is_spicy") is not None else None
        )
        result["cooking_method_include"] = parsed.get("cooking_method_include") or []
        result["cooking_method_exclude"] = parsed.get("cooking_method_exclude") or []
        result["category_hint"] = parsed.get("category_hint") or None
        result["semantic_description"] = str(parsed.get("semantic_description") or query)
        return result
    except Exception as e:
        logger.warning("LLM query parse failed: %s", e)
        return None


# ── Keyword fallback: category synonym map + regex ──────────

_CATEGORY_SYNONYMS: list[tuple[list[str], str]] = [
    (["drink", "drinks", "beverage", "beverages", "juice", "juices", "shake", "shakes",
      "lassi", "chai", "tea", "coffee", "soda", "mocktail", "smoothie", "buttermilk",
      "chaas", "liquid"], "Beverages"),
    (["bread", "breads", "naan", "roti", "paratha", "kulcha", "tandoori roti"], "Breads"),
    (["soup", "soups", "broth", "clear soup", "shorba"], "Soups"),
    (["dessert", "desserts", "sweet", "sweets", "pudding", "halwa", "kheer",
      "gulab jamun", "rasmalai", "kulfi", "brownie", "cake", "ice cream", "pastry"], "Dessert"),
    (["starter", "starters", "appetizer", "appetizers", "snack", "snacks",
      "tikka", "kabab", "chaat", "roll", "rolls", "fingers", "finger food",
      "pakora", "samosa"], "Starters"),
    (["rice", "biryani", "pulao", "fried rice", "jeera rice", "noodles"], "Rice"),
    (["dosa", "idli", "uttapam", "upma", "poha", "south indian"], "South Indian"),
    (["main course", "curry", "gravy", "meal", "entree", "chicken",
      "mutton", "fish", "paneer", "dal", "subzi"], "Main Course"),
]
# ponytail: meal-time words ("lunch", "dinner", "breakfast") deliberately
# excluded from category_hint mappings - they flow through semantic_description
# to the LLM ranking step instead, which handles contextual appropriateness.
# "breakfast" items (idli, dosa) are already covered by "South Indian".

# Build a flat keyword -> category mapping (first match wins)
_CAT_KEYWORD_MAP: dict[str, str] = {}
for kw_list, cat in _CATEGORY_SYNONYMS:
    for kw in kw_list:
        if kw not in _CAT_KEYWORD_MAP:
            _CAT_KEYWORD_MAP[kw] = cat


def _keyword_parse(query: str) -> dict[str, Any]:
    q = query.lower()

    # ── Price ──
    max_price = None
    m = re.search(r"(?:under|below|less than|upto|up to|within)\s*(?:rs\.?|₹|inr)?\s*(\d+)", q)
    if m:
        max_price = int(m.group(1))
    min_price = None
    m = re.search(r"(?:above|over|more than|greater than|at least|minimum|min)\s*(?:rs\.?|₹|inr)?\s*(\d+)", q)
    if m:
        min_price = int(m.group(1))

    # ── Vegetarian ──
    is_vegetarian = None
    if re.search(r"\b(vegetarian|veg)\b", q):
        is_vegetarian = True
    if re.search(r"\bnon\s*veg\b", q):
        is_vegetarian = False

    # ── Spicy (skip "hot" in beverage context) ──
    is_spicy = None
    if re.search(r"\b(not spicy|non spicy|mild|no spice)\b", q):
        is_spicy = False
    elif re.search(r"\b(spicy|spice|hot)\b", q):
        if not re.search(r"\b(drink|drinks|beverage|beverages|juice|chai|tea|coffee|cold)\b", q):
            is_spicy = True

    # ── Cooking method include/exclude ──
    cooking_method_include: list[str] = []
    cooking_method_exclude: list[str] = []
    all_methods = ["fried", "steamed", "boiled", "grilled", "baked", "roasted", "tandoori", "sauteed", "raw"]
    for method in all_methods:
        if re.search(rf"\b{method}\b", q) and not re.search(rf"\bnot\s+{method}\b|\bno\s+{method}\b", q):
            cooking_method_include.append(method)
    for method in all_methods:
        if re.search(rf"\bnot\s+{method}\b|\bno\s+{method}\b|\bwithout\s+{method}\b", q):
            if method in cooking_method_include:
                cooking_method_include.remove(method)
            if method not in cooking_method_exclude:
                cooking_method_exclude.append(method)

    # ── Category hint ──
    category_hint = None
    # Try multi-word keys first (longest match)
    for kw in sorted(_CAT_KEYWORD_MAP, key=len, reverse=True):
        if re.search(rf"\b{re.escape(kw)}\b", q):
            category_hint = _CAT_KEYWORD_MAP[kw]
            break

    # ── Semantic description (strip only filter-artifact words) ──
    filter_words = [
        "under", "below", "less than", "upto", "up to", "within",
        "above", "over", "more than", "greater than", "at least", "minimum", "min",
        "not fried", "no fried", "non fried", "without frying",
        "not grilled", "not baked", "not steamed", "not roasted",
        "not spicy", "non spicy", "no spice", "mild",
        "vegetarian", "veg", "non veg",
        "fried", "grilled", "baked", "steamed", "roasted", "boiled", "tandoori", "sauteed",
        "rupees", "rs.", "inr", "healthy", "light",
        "something",  # filler in "something to drink"
    ]
    desc = q
    for w in sorted(filter_words, key=len, reverse=True):
        desc = re.sub(rf"\b{re.escape(w)}\b", " ", desc)
    desc = re.sub(r"\d+", "", desc)
    desc = re.sub(r"\s+", " ", desc).strip()
    if not desc or len(desc) < 2:
        desc = q

    return {
        "max_price": max_price,
        "min_price": min_price,
        "is_vegetarian": is_vegetarian,
        "is_spicy": is_spicy,
        "cooking_method_include": cooking_method_include,
        "cooking_method_exclude": cooking_method_exclude,
        "category_hint": category_hint,
        "semantic_description": desc,
    }


def parse_query(query: str) -> dict[str, Any]:
    result = _llm_parse(query)
    if result is None:
        logger.info("LLM parser unavailable - using keyword fallback for %r", query)
        result = _keyword_parse(query)
    logger.info("parse_query(%r) -> meal_type=%r category_hint=%r cm_inc=%r cm_exc=%r sem=%r",
                query, result.get("meal_type"), result.get("category_hint"),
                result.get("cooking_method_include"), result.get("cooking_method_exclude"),
                result.get("semantic_description"))
    return result
