# app/api/models.py
from pydantic import BaseModel
from typing import List, Dict, Any

class SearchQuery(BaseModel):
    query: str

class Product(BaseModel):
    id: str
    document: str
    metadata: Dict[str, Any]

class SearchResponse(BaseModel):
    ranked_ids: List[str]