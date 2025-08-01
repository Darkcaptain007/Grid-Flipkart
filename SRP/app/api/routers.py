# app/api/routers.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from .models import SearchQuery, Product, SearchResponse
from ..services.search_service import SearchService
from ..db.chroma_manager import ChromaManager
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# --- Dependency Injection: Create instances once for the app's lifetime ---
try:
    logger.info("Initializing application components...")
    chroma_manager = ChromaManager()
    search_service = SearchService(chroma_manager)
    logger.info("Application components initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize application components: {e}")
    # If core components fail, the app can't run.
    raise RuntimeError("Could not start the application due to initialization failure.") from e


def get_search_service():
    """Dependency function to get the search service instance."""
    return search_service
# --------------------------------------------------------------------------

@router.post("/search", response_model=SearchResponse)
async def search_products(request: SearchQuery, service: SearchService = Depends(get_search_service)):
    logger.info(f"Received search query: '{request.query}'")
    # `await` the asynchronous service call
    ranked_ids = await service.search(request.query)
    logger.info(f"Returning {len(ranked_ids)} ranked results.")
    return SearchResponse(ranked_ids=ranked_ids)

@router.post("/products", status_code=status.HTTP_201_CREATED)
def add_products(products: List[Product], service: SearchService = Depends(get_search_service)):
    """
    Add one or more new products to the search index.
    Embeddings are generated on the fly.
    """
    try:
        logger.info(f"Received request to add {len(products)} products.")
        # Pydantic models need to be converted to dicts
        product_dicts = [p.dict() for p in products]
        service.insert_products(product_dicts)
        return {"message": f"{len(products)} products added/updated successfully."}
    except Exception as e:
        logger.error(f"Error adding products: {e}")
        raise HTTPException(status_code=500, detail="Failed to add products to the index.")