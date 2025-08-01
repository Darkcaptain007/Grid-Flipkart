# app/services/intent_classifier.py
from ..db.chroma_manager import ChromaManager
from ..core.config import CATEGORY_COLLECTION_NAME
import logging
import numpy as np

logger = logging.getLogger(__name__)

class IntentClassifier:
    def __init__(self, chroma_manager: ChromaManager):
        logger.info("Initializing Intent Classifier...")
        self.chroma = chroma_manager
        self.collection_name = CATEGORY_COLLECTION_NAME

    async def predict_categories(self, query_embedding: np.ndarray, top_k: int = 3):
        """
        Predicts categories based on a pre-computed query embedding.
        
        Args:
            query_embedding (np.ndarray): The embedding of the user's query.
            top_k (int): The number of top categories to return.
        
        Returns:
            list[str]: A list of predicted category names.
        """

        # Query the CATEGORY collection in ChromaDB
        try:
            # results = await self.chroma.aquery_collection(
            #     collection_name=self.collection_name,
            #     query_embedding=query_embedding,
            #     n_results=top_k
            # )
            # # The predicted categories are the IDs/documents of the results
            # predicted_categories = results['documents'][0]
            # return predicted_categories
            results = await self.chroma.aquery_collection(
                collection_name=self.collection_name,
                query_embedding=query_embedding,
                n_results=top_k*6,
            )
            # The predicted categories are the IDs/documents of the results
            predicted_categories = results['documents'][0]
            
            # This handles your "non-unique results" question!
            # Convert to a dictionary and back to a list to get unique values while preserving order.
            unique_predicted_categories = list(dict.fromkeys(predicted_categories))[:top_k]
            
            return unique_predicted_categories
        except Exception as e:
            logger.error(f"Could not query category collection: {e}. Intent classification disabled for this query.")
            return []