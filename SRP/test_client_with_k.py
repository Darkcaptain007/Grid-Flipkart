import requests
import pandas as pd
import sys
import time
import textwrap
import os
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.core.config import PRODUCT_DATA_PATH, CLIENT_DISPLAY_COUNT

# --- Configuration ---
API_URL = "http://localhost:8000/api/search"
DATA_FILE_PATH = PRODUCT_DATA_PATH
DEFAULT_K = CLIENT_DISPLAY_COUNT

def load_and_index_data(file_path):
    """
    Loads the product data from a CSV and sets 'pid' as the index for fast lookups.
    Returns the indexed DataFrame or None if the file is not found.
    """
    try:
        print(f"Loading and indexing data from '{file_path}'...")
        df = pd.read_csv(file_path)
        # Use 'pid' as the unique identifier and set it as the index. Clean the data.
        df.dropna(subset=['pid', 'product_name', 'description'], inplace=True)
        df.drop_duplicates(subset=['pid'], keep='first', inplace=True)

        df_indexed = df.set_index('pid')
        print("Data loaded and indexed successfully.")
        return df_indexed
    except FileNotFoundError:
        print(f"ERROR: Data file not found at '{file_path}'.")
        return None
    except KeyError:
        print(f"ERROR: The CSV file at '{file_path}' must contain a 'pid' column.")
        return None

def call_search_api(query):
    """
    Sends a search query to the API and returns the list of ranked PIDs.
    """
    print(f"\nSending query to API: '{query}'")
    try:
        start_time = time.time()
        response = requests.post(API_URL, json={"query": query})
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        end_time = time.time()
        
        print(f"API response received in {end_time - start_time:.2f} seconds.")
        return response.json().get('ranked_ids', [])
    except requests.exceptions.RequestException as e:
        print("\n--- API REQUEST FAILED ---")
        print(f"Could not connect to the search API at {API_URL}.")
        print("Please ensure the uvicorn server is running: `uvicorn app.main:app --reload`")
        print(f"Error details: {e}")
        return None

def display_results(indexed_df, pids, k):
    """
    Fetches product details from the indexed DataFrame and displays the top K results.
    """
    if not pids:
        print("\n--- No results found for your query. ---")
        return

    top_pids = pids[:k]
    
    # Use .loc for super-fast lookups from the indexed DataFrame
    # We use reindex to handle cases where a PID might not be in the df, filling with NaN
    results_df = indexed_df.reindex(top_pids)
    
    print("\n" + "="*50)
    print(f"  Top {min(k, len(results_df))} Search Results")
    print("="*50 + "\n")

    for i, (pid, row) in enumerate(results_df.iterrows()):
        if pd.isna(row['product_name']):
            print(f"{i+1}. Product with PID '{pid}' not found in local data file.")
            continue

        # Use textwrap for clean description formatting
        description = textwrap.shorten(str(row.get('description', 'No description available.')), width=100, placeholder="...")

        print(f"{i+1}. {row['product_name']}")
        print(f"   - PID:    {pid}")
        print(f"   - Brand:  {row.get('brand', 'N/A')}")
        print(f"   - Price:  ₹{row.get('discounted_price', 'N/A')}")
        print(f"   - Rating: {row.get('product_rating', 'N/A')}")
        print(f"   - Desc:   {description}\n")

def main():
    """
    Main function to drive the client application.
    """
    product_df_indexed = load_and_index_data(DATA_FILE_PATH)
    if product_df_indexed is None:
        sys.exit(1)

    while True:
        # --- Get user input ---
        query = input("Enter your search query (or 'quit' to exit): ")
        if query.lower() == 'quit':
            break
        if not query:
            print("Please enter a valid query.")
            continue

        try:
            k_str = input(f"How many top results to display? (e.g., {DEFAULT_K}): ")
            if not k_str:  # If user just presses Enter
                k = DEFAULT_K
            else:
                k = int(k_str)
            if k <= 0: raise ValueError
        except (ValueError, TypeError):
            print(f"Invalid number. Defaulting to {DEFAULT_K} results.")
            k = DEFAULT_K

        # --- Call API and display results ---
        ranked_pids = call_search_api(query)
        if ranked_pids is not None:
            display_results(product_df_indexed, ranked_pids, k)

if __name__ == "__main__":
    main()