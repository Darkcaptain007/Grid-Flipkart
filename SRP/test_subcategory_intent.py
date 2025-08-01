import pandas as pd
import sys
from pathlib import Path
import asyncio
from tqdm.asyncio import tqdm # Ensure this is the asyncio version of tqdm

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parent))

from app.services.search_service import SearchService
from app.db.chroma_manager import ChromaManager
from app.core.config import QUERY_CLASSIFICATION_TOP_K

test_data_path = "data/gemini_generated_queries_live.csv"
async def run_evaluation():
    """
    Loads the test queries, runs them through the IntentClassifier,
    and calculates performance metrics.
    """
    print("--- Intent Classifier Evaluation Script ---")
    
    # --- 1. Initialization ---
    print("Initializing necessary components (ChromaDB, Models)...")
    try:
        chroma_manager = ChromaManager()
        search_service = SearchService(chroma_manager)
        intent_classifier = search_service.intent_classifier
        print("Components initialized.")
    except Exception as e:
        print(f"\nFATAL ERROR: Could not initialize components: {e}")
        print("Please ensure you have run 'scripts/bulk_indexer.py' successfully first.")
        return

    # --- 2. Load Test Data ---
    try:
        test_df = pd.read_csv(test_data_path)
        print(f"Loaded {len(test_df)} test queries from '{test_data_path}'.")
    except FileNotFoundError:
        print(f"\nFATAL ERROR: Test data file not found at '{test_data_path}'")
        print("Please run 'scripts/generate_test_queries.py' first.")
        return

    # --- 3. Run Evaluation Loop ---
    
    # This nested function is a coroutine function.
    # Calling it creates a coroutine object.
    async def evaluate_row(row):
        original_cat = row['original_subcategory']
        query = row['generated_query']
        
        # Note: We need the embed_model from the search_service
        query_embedding = search_service.embed_model.encode(query)
        predicted_cats = await intent_classifier.predict_categories(
            query_embedding=query_embedding,
            top_k=QUERY_CLASSIFICATION_TOP_K
        )
        
        if original_cat in predicted_cats:
            rank = predicted_cats.index(original_cat) + 1
            return {"hit": True, "rank": rank, "original": original_cat, "predicted": predicted_cats, "query": query}
        else:
            return {"hit": False, "rank": 0, "original": original_cat, "predicted": predicted_cats, "query": query}

    # Create a list of coroutine objects
    tasks = [evaluate_row(row) for _, row in test_df.iterrows()]
    
    # --- THE FIX IS HERE: Unpack the list with the '*' operator ---
    results = await tqdm.gather(*tasks, desc="Evaluating Queries")

    # --- 4. Process Results and Calculate Metrics ---
    hit_count = 0
    top_1_hit_count = 0
    mrr_sum = 0.0
    misses = []
    
    for res in results:
        if res["hit"]:
            hit_count += 1
            mrr_sum += 1.0 / res["rank"]
            if res["rank"] == 1:
                top_1_hit_count += 1
        else:
            misses.append(res)
            
    total_queries = len(test_df)
    miss_count = total_queries - hit_count
    
    # Calculate final metrics
    top_k_accuracy = (hit_count / total_queries) * 100 if total_queries > 0 else 0
    top_1_accuracy = (top_1_hit_count / total_queries) * 100 if total_queries > 0 else 0
    mean_reciprocal_rank = mrr_sum / total_queries if total_queries > 0 else 0

    # --- 5. Display Report ---
    print("\n" + "="*50)
    print("  Intent Classification Evaluation Report")
    print("="*50)
    print(f"Total Queries Evaluated: {total_queries}")
    print(f"Correct Predictions (Hit Count): {hit_count}")
    print(f"Incorrect Predictions (Miss Count): {miss_count}")
    print("-" * 50)
    print(f"Top-{QUERY_CLASSIFICATION_TOP_K} Accuracy: {top_k_accuracy:.2f}%")
    print(f"Top-1 Accuracy: {top_1_accuracy:.2f}%")
    print(f"Mean Reciprocal Rank (MRR): {mean_reciprocal_rank:.4f}")
    print("="*50)

    if misses:
        print(f"\nAnalysis of Top {min(50, len(misses))} Misses:")
        for i, miss in enumerate(misses[:50]):
            print(f"  {i+1}. Query: '{miss['query']}'")
            print(f"     Expected: '{miss['original']}'")
            print(f"     Predicted: {miss['predicted']}\n")

async def main():
    await run_evaluation()

if __name__ == "__main__":
    asyncio.run(main())