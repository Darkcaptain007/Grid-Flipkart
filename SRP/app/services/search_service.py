# app/services/search_service.py

from ..db.chroma_manager import ChromaManager
from ..models.model_loader import get_embedding_model, get_reranker_model
from .intent_classifier import IntentClassifier # Import the new class
import logging
import asyncio # Import asyncio
from ..core.config import PRODUCT_COLLECTION_NAME, QUERY_CLASSIFICATION_TOP_K, CANDIDATES_PER_CATEGORY, FALLBACK_CANDIDATE_COUNT


logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self, chroma_manager: ChromaManager):
        self.chroma = chroma_manager
        self.embed_model = get_embedding_model()
        self.reranker = get_reranker_model()
        # The classifier now needs the chroma_manager
        self.intent_classifier = IntentClassifier(chroma_manager)
        self.product_collection_name = PRODUCT_COLLECTION_NAME
    
    async def search(self, query: str):
        # Stage 1: Query Embedding
        query_embedding = self.embed_model.encode(query)

        # Stage 2: Intent Classification (This is fast, can remain sync)
        predicted_cats = await self.intent_classifier.predict_categories(query_embedding, top_k=QUERY_CLASSIFICATION_TOP_K)
        logger.info(f"Predicted intent categories: {predicted_cats}")

        # Stage 2: Concurrent Candidate Retrieval
        tasks = []
        if not predicted_cats:
            # Fallback for general search
            task = self.chroma.aquery_collection(
                collection_name=self.product_collection_name,
                query_embedding=query_embedding,
                n_results=FALLBACK_CANDIDATE_COUNT
            )
            tasks.append(task)
        else:
            logger.info(f"Fetching {CANDIDATES_PER_CATEGORY} candidates for each of {len(predicted_cats)} categories.")
            # Create a list of concurrent tasks, one for each category query
            for category in predicted_cats:
                where_filter = {"subcategory": {"$eq": category}}
                task = self.chroma.aquery_collection(
                    collection_name=self.product_collection_name,
                    query_embedding=query_embedding,
                    where_filter=where_filter,
                    n_results=CANDIDATES_PER_CATEGORY
                )
                tasks.append(task)
        
        # Run all tasks concurrently and wait for them all to complete
        logger.info(f"Concurrently fetching candidates for {len(tasks)} tasks...")
        all_results = await asyncio.gather(*tasks)
        logger.info("All candidate fetches complete.")

        # Process the results from all concurrent calls
        all_candidates = {}
        for result_set in all_results:
            if result_set and result_set.get('ids') and result_set['ids'][0]:
                for i, pid in enumerate(result_set['ids'][0]):
                    all_candidates[pid] = result_set['documents'][0][i]

        candidate_ids = list(all_candidates.keys())
        candidate_docs = list(all_candidates.values())
        logger.info(f"Total unique candidates to rerank: {len(candidate_ids)}")

        # Stage 3: Reranking (This part is CPU/GPU bound, can remain sync)
        reranker_input = {'ids': [candidate_ids], 'documents': [candidate_docs]}
        # We can run the sync reranker in a thread to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        sorted_ids = await loop.run_in_executor(
            None, self._rerank_results, query, reranker_input
        )
        return sorted_ids
    
    def _rerank_results(self, query, chroma_results):
        ids = chroma_results['ids'][0]
        docs = chroma_results['documents'][0]
        
        if not ids:
            return []
            
        pairs = [[query, doc] for doc in docs]
        scores = self.reranker.predict(pairs)
        
        id_score_pairs = sorted(zip(scores, ids), key=lambda x: x[0], reverse=True)
        return [pair[1] for pair in id_score_pairs]

    def insert_products(self, products: list[dict]):
        # products is a list of dicts, each with 'id', 'document', 'metadata'
        ids = [p['id'] for p in products]
        docs = [p['document'] for p in products]
        metadatas = [p['metadata'] for p in products]

        # Generate embeddings in a batch
        embeddings = self.embed_model.encode(docs, show_progress_bar=True)
        
        # Add to DB
        self.chroma.add_items_to_collection(
            collection_name=self.product_collection_name,
            ids=ids,
            documents=docs, # Storing the combined_text as the document
            embeddings=embeddings.tolist(),
            metadatas=metadatas
        )
        logger.info("Products added successfully.")