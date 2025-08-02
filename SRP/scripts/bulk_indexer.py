import pandas as pd
import sys
from pathlib import Path
from tqdm import tqdm

# Add app directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.models.model_loader import get_embedding_model
from app.db.chroma_manager import ChromaManager
from app.core.config import (
    PRODUCT_DATA_PATH, CATEGORY_DATA_PATH,
    PRODUCT_COLLECTION_NAME, CATEGORY_COLLECTION_NAME, BATCH_SIZE
)

def clean_product_data(df: pd.DataFrame) -> pd.DataFrame:
    df.dropna(subset=['pid', 'product_name', 'description'], inplace=True)
    df.drop_duplicates(subset=['pid'], keep='first', inplace=True)
    df['subcategory'] = df['subcategory'].astype(str).str.strip()
    df['combined_text'] = (
        df['product_name'].astype(str) + ". " +
        df['brand'].fillna('Unknown').astype(str) + ". " +
        df['description'].astype(str)
    )
    return df

def index_products(chroma_manager, embed_model):
    print("\n--- Starting Product Indexing ---")
    df = pd.read_csv(PRODUCT_DATA_PATH)
    df_cleaned = clean_product_data(df)
    
    print(f"Processing {len(df_cleaned)} products in batches of {BATCH_SIZE}...")
    
    # Use tqdm to show progress over the batches
    for i in tqdm(range(0, len(df_cleaned), BATCH_SIZE)):
        batch_df = df_cleaned.iloc[i : i + BATCH_SIZE]

        # Prepare data ONLY for this batch
        ids = batch_df["pid"].tolist()
        documents = batch_df["combined_text"].tolist()
        metadatas = batch_df[["subcategory"]].to_dict('records')
        
        # Generate embeddings ONLY for this batch
        embeddings = embed_model.encode(documents, show_progress_bar=False) # No need for inner progress bar
        
        # Add this complete batch to the collection
        chroma_manager.add_items_to_collection(
            collection_name=PRODUCT_COLLECTION_NAME,
            ids=ids,
            documents=documents,
            embeddings=embeddings.tolist(),
            metadatas=metadatas
        )
    print(f"Product indexing for collection '{PRODUCT_COLLECTION_NAME}' complete.")

def index_categories(chroma_manager, embed_model):
    print("\n--- Starting Category Indexing ---")
    df = pd.read_csv(CATEGORY_DATA_PATH)
    
    # --- Data Cleaning and Preparation ---
    # Drop rows where either column is missing
    df.dropna(subset=['subcategory', 'search_string'], inplace=True)
    
    # Clean both columns
    df['subcategory'] = df['subcategory'].astype(str).str.strip()
    df['search_string'] = df['search_string'].astype(str).str.strip()
    

    category_df = df.drop_duplicates()

    print(f"Processing {len(category_df)} search strings...")

    # Iterate through the de-duplicated DataFrame in batches
    for i in tqdm(range(0, len(category_df), BATCH_SIZE)):
        batch_df = category_df.iloc[i : i + BATCH_SIZE]
        
        # The ID is the cleaned subcategory name combined with the search string
        # This ensures uniqueness and clarity in the ID
        ids = [f"{row['subcategory']}_{row['search_string']}" for _, row in batch_df.iterrows()]

        # The document to be embedded is the corresponding search_string
        documents_to_embed = batch_df['search_string'].tolist()
        # documents_to_embed = batch_df['subcategory'].tolist()
        
        # The document stored in Chroma can be the subcategory name itself for clarity in logs
        stored_documents = batch_df['subcategory'].tolist()

        embeddings = embed_model.encode(documents_to_embed, show_progress_bar=False)
        
        chroma_manager.add_items_to_collection(
            collection_name=CATEGORY_COLLECTION_NAME,
            ids=ids,
            # We store the simple subcategory name as the "document" for easy viewing,
            # but the embedding is based on the richer search_string.
            documents=stored_documents,
            embeddings=embeddings.tolist()
        )
    print(f"Category indexing for collection '{CATEGORY_COLLECTION_NAME}' complete.")

def main():
    print("Initializing components for bulk indexing...")
    embed_model = get_embedding_model()
    chroma_manager = ChromaManager()

    index_products(chroma_manager, embed_model)
    index_categories(chroma_manager, embed_model)

    print("\n--- Bulk Indexing Complete for all collections! ---")

if __name__ == "__main__":
    main()