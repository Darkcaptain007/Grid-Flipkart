import pandas as pd
import requests
import sys
from pathlib import Path

# Add project root to path to import from app and other scripts
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.config import PRODUCT_DATA_PATH, API_BASE_URL
# from scripts.utils import append_product_to_csv # Optional: if you want to use the helper

API_URL = f"{API_BASE_URL}/api/products"

def find_product_by_pid(pid_to_find: str):
    """
    Finds a product in the main CSV file by its PID.
    """
    try:
        df = pd.read_csv(PRODUCT_DATA_PATH)
        product_row = df[df['pid'] == pid_to_find]
        
        if product_row.empty:
            print(f"Error: Product with PID '{pid_to_find}' not found in {PRODUCT_DATA_PATH}")
            return None
            
        # Return the first match as a dictionary
        return product_row.iloc[0].to_dict()
    except FileNotFoundError:
        print(f"Error: Product data file not found at '{PRODUCT_DATA_PATH}'")
        return None

def prepare_product_for_api(product_dict: dict):
    """
    Takes a product dictionary and prepares it for the API payload.
    This includes creating 'combined_text' and structuring the metadata.
    """
    # Replicate the cleaning and data prep logic from the bulk indexer
    product_name = str(product_dict.get('product_name', ''))
    brand = str(product_dict.get('brand', 'Unknown'))
    description = str(product_dict.get('description', ''))
    subcategory = str(product_dict.get('subcategory', '')).strip()

    combined_text = f"{product_name}. {brand}. {description}"
    
    # Structure the payload to match the Pydantic model in the API
    api_payload = {
        "id": product_dict['pid'],
        "document": combined_text,
        "metadata": {
            "subcategory": subcategory
            # You can add more metadata here if your service uses it
        }
    }
    return api_payload

def main():
    """
    Main function to drive the script.
    """
    if len(sys.argv) < 2:
        print("Usage: python scripts/add_new_product.py <PID_OF_PRODUCT_TO_ADD>")
        sys.exit(1)
        
    target_pid = sys.argv[1]
    print(f"Attempting to add product with PID: {target_pid}")

    # 1. Find the product in the master CSV
    product_data = find_product_by_pid(target_pid)
    if not product_data:
        return

    # 2. Prepare the data for the API endpoint
    api_payload = prepare_product_for_api(product_data)
    
    print("\nPrepared API Payload:")
    print(api_payload)

    # 3. Send the request to the running API server
    print(f"\nSending data to API at {API_URL}...")
    try:
        # The API expects a list of products, so we wrap our payload in a list
        response = requests.post(API_URL, json=[api_payload])
        response.raise_for_status() # Raise an exception for HTTP errors
        
        print("\n--- Success! ---")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print(f"Product '{target_pid}' should now be searchable in the index.")

    except requests.exceptions.RequestException as e:
        print("\n--- API Request Failed ---")
        print(f"Could not connect to the search API at {API_URL}.")
        print("Please ensure the uvicorn server is running.")
        print(f"Error details: {e}")

if __name__ == "__main__":
    main()