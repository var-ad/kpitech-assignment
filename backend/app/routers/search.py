"""AI search endpoint - parses, filters, ranks, and returns menu search results.

Pipeline:  query_parser.parse_query → hard SQL filters → category_hint filter
         → cascade relax → LLM rank → score threshold → return top 15
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from openai import OpenAI
from sqlalchemy import not_
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.menu_item import CookingMethod, MenuItem
from app.schemas.search import SearchItem, SearchRequest, SearchResponse
from app.services.query_parser import parse_query
from app.services.llm_rank import rank_candidates

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/menu/search", tags=["search"])

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
_openai_client: OpenAI | None = None
MAX_RESULTS = 15
OFF_TOPIC_SEARCH_MESSAGE = (
    "I can only help you search the menu - try something like "
    "'spicy vegetarian under 200' or 'light lunch'."
)


def _client() -> OpenAI | None:
    global _openai_client
    if _openai_client is None and DEEPSEEK_API_KEY:
        _openai_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
    return _openai_client


def _cm_enum(s: str) -> CookingMethod:
    try:
        return CookingMethod(s)
    except ValueError:
        return CookingMethod.none


@router.post("", response_model=SearchResponse)
async def search(body: SearchRequest, db: Session = Depends(get_db)):
    logger.info("search: query=%r", body.query)

    # ── 1. Parse the query ─────────────────────────────────
    parsed = parse_query(body.query)
    logger.info("search: parsed -> %s", {
        k: v for k, v in parsed.items() if v not in (None, [], "")
    })

    if parsed.get("is_food_related") is False:
        logger.info("search: off-topic query rejected before filtering: %r", body.query)
        return SearchResponse(
            items=[],
            relaxed_filters=False,
            relaxed_note=OFF_TOPIC_SEARCH_MESSAGE,
        )

    max_price = parsed.get("max_price")
    min_price = parsed.get("min_price")
    is_vegetarian = parsed.get("is_vegetarian")
    is_spicy = parsed.get("is_spicy")
    cm_include = parsed.get("cooking_method_include", [])
    cm_exclude = parsed.get("cooking_method_exclude", [])
    category_hint = parsed.get("category_hint")
    semantic_description = parsed.get("semantic_description") or body.query

    # ── 2. Base query ──────────────────────────────────────
    base = db.query(MenuItem).filter(
        MenuItem.available == True,
        MenuItem.deleted_at.is_(None),
    )

    # ── 3. Apply filters based on active flags (no closure bugs) ──
    def _apply(q, *, price=True, veg_spicy=True, cook=True):
        """Apply hard filters to query *q*. Flags control which filter groups are active."""
        if price and max_price is not None:
            q = q.filter(MenuItem.price <= max_price)
        if price and min_price is not None:
            q = q.filter(MenuItem.price >= min_price)
        if veg_spicy and is_vegetarian is not None:
            q = q.filter(MenuItem.is_vegetarian == is_vegetarian)
        if veg_spicy and is_spicy is not None:
            q = q.filter(MenuItem.is_spicy == is_spicy)
        if cook and cm_include:
            q = q.filter(MenuItem.cooking_method.in_(_cm_enum(m) for m in cm_include))
        if cook and cm_exclude:
            q = q.filter(not_(MenuItem.cooking_method.in_(_cm_enum(m) for m in cm_exclude)))
        return q

    # ── 4. Initial query: apply all hard filters + category_hint ──
    query = _apply(base)
    if category_hint:
        query = query.filter(MenuItem.category.ilike(f"%{category_hint}%"))
    results = query.all()
    relaxed = False
    parts: list[str] = []

    # ── 5. Cascade relax (drop one group at a time) ────────
    if not results and category_hint:
        relaxed = True
        parts.append(f"No items in '{category_hint}' category")
        logger.info("search: relaxing category_hint")
        query = _apply(base)  # re-apply all hard filters, drop category_hint
        results = query.order_by(MenuItem.price).all()

    if not results and (cm_include or cm_exclude):
        relaxed = True
        parts.append(f"No items with cooking method filter{'s' if cm_include and cm_exclude else ''}")
        logger.info("search: relaxing cooking_method")
        query = _apply(base, cook=False)
        if category_hint:
            query = query.filter(MenuItem.category.ilike(f"%{category_hint}%"))
        results = query.order_by(MenuItem.price).all()

    if not results and category_hint:
        relaxed = True
        query = _apply(base, cook=False)  # re-apply hard (no cook), drop cat
        results = query.order_by(MenuItem.price).all()

    if not results and (max_price is not None or min_price is not None):
        relaxed = True
        logger.info("search: relaxing price")
        query = _apply(base, price=False, cook=False)
        if category_hint:
            query = query.filter(MenuItem.category.ilike(f"%{category_hint}%"))
        results = query.order_by(MenuItem.price).all()

    if not results and category_hint:
        relaxed = True
        query = _apply(base, price=False, cook=False)
        results = query.order_by(MenuItem.price).all()

    if not results and (is_vegetarian is not None or is_spicy is not None):
        relaxed = True
        logger.info("search: relaxing veg/spicy")
        query = _apply(base, veg_spicy=False, price=False, cook=False)
        if category_hint:
            query = query.filter(MenuItem.category.ilike(f"%{category_hint}%"))
        results = query.order_by(MenuItem.price).all()

    if not results and category_hint:
        relaxed = True
        query = _apply(base, veg_spicy=False, price=False, cook=False)
        results = query.order_by(MenuItem.price).all()

    # ── 6. Absolute fallback: full menu, ranked by LLM ─────
    if not results:
        relaxed = True
        logger.info(
            "search: absolute fallback - ranking full menu query=%r parsed=%s",
            body.query,
            {k: v for k, v in parsed.items() if v not in (None, [], "")},
        )
        results = base.all()

    # ── 7. Build relaxed_note ──────────────────────────────
    relaxed_note: str | None = None
    if relaxed:
        if not results:
            relaxed_note = "No items found."
        elif parts:
            relaxed_note = ". ".join(parts) + ". Showing closest matches below."
        else:
            relaxed_note = "No exact matches found - showing closest overall matches below."

    # ── 8. LLM ranking ─────────────────────────────────────
    cl = _client()
    logger.info("search: candidate count=%d, sending to LLM rank", len(results))
    ranked = rank_candidates(
        query=body.query,
        semantic_description=semantic_description,
        category_hint=category_hint,
        candidates=results,
        client=cl,
    )

    if ranked is not None and len(ranked) == 0 and relaxed:
        # LLM scored everything below threshold - fall back to unranked top results
        logger.warning(
            "search: relaxed query ranked empty - fallback to unranked top %d "
            "query=%r candidates=%d parsed=%s",
            MAX_RESULTS,
            body.query,
            len(results),
            {k: v for k, v in parsed.items() if v not in (None, [], "")},
        )
        ranked = None

    if ranked is not None:
        items = [
            SearchItem(
                id=item.id,
                name=item.name,
                description=item.description,
                category=item.category,
                price=item.price,
                is_vegetarian=item.is_vegetarian,
                is_spicy=item.is_spicy,
                available=item.available,
                score=round(score, 2) if score > 0 else None,
            )
            for score, item in ranked[:MAX_RESULTS]
        ]
    else:
        if relaxed and results:
            logger.warning(
                "search: relaxed unscored fallback returned menu items "
                "query=%r count=%d parsed=%s",
                body.query,
                min(len(results), MAX_RESULTS),
                {k: v for k, v in parsed.items() if v not in (None, [], "")},
            )
        items = [
            SearchItem(
                id=item.id,
                name=item.name,
                description=item.description,
                category=item.category,
                price=item.price,
                is_vegetarian=item.is_vegetarian,
                is_spicy=item.is_spicy,
                available=item.available,
                score=None,
            )
            for item in results[:MAX_RESULTS]
        ]

    logger.info("search: returning %d items, relaxed=%s", len(items), relaxed)
    return SearchResponse(items=items, relaxed_filters=relaxed, relaxed_note=relaxed_note)
