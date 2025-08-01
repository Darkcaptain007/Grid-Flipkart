# app/core/config.py
from pathlib import Path
import os

# --- Configuration for SRP Application ---
# Base directory for the application
ROOT_DIR = Path(__file__).parent.parent.parent


# Final number of results to display in the client script
CLIENT_DISPLAY_COUNT=10

# --- Data Files ---
# All files are expected to be in the 'data/' directory
PRODUCT_DATA_FILE="cleaned_combined.csv"
# CATEGORY_DATA_FILE=subcategories_with_search_strings.csv
CATEGORY_DATA_FILE="subcategories_search_terms_multiline.csv"

# --- Data File Paths ---
PRODUCT_DATA_PATH = ROOT_DIR / "data" / PRODUCT_DATA_FILE
CATEGORY_DATA_PATH = ROOT_DIR / "data" / CATEGORY_DATA_FILE

# --- ChromaDB Collection Names ---

# ChromaDB settings
DB_PATH = str(ROOT_DIR / "db_storage")
PRODUCT_COLLECTION_NAME="products_v1"
CATEGORY_COLLECTION_NAME="categories_v1"

# Model settings
EMBEDDING_MODEL = 'all-MiniLM-L6-v2' # Use a smaller one for faster local iteration
RERANKER_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2'

# --- Search Hyperparameters ---
# Number of top categories to predict for a query (K)
QUERY_CLASSIFICATION_TOP_K=3

# Number of candidates to retrieve for each predicted category (M)
CANDIDATES_PER_CATEGORY=70

# Total candidates to retrieve if intent classification fails
FALLBACK_CANDIDATE_COUNT=200

# Batch size for bulk indexing
BATCH_SIZE = 512


