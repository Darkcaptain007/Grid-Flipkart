# app/db/chroma_manager.py
    
import chromadb
from ..core.config import DB_PATH
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class ChromaManager:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=DB_PATH)
        logger.info("ChromaDB client initialized.")

    def add_items_to_collection(
        self,
        collection_name: str,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Adds a batch of items to a specified collection.
        The caller is responsible for batching the data.
        """
        collection = self.client.get_or_create_collection(name=collection_name)
        
        # Directly add the provided batch. No internal looping.
        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        # We don't log here to avoid spamming the console from the indexer's loop.

    async def aquery_collection(self, collection_name, query_embedding, n_results=100, where_filter=None):
        # This part remains the same
        collection = self.client.get_collection(name=collection_name)
        return collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
            where=where_filter
        )