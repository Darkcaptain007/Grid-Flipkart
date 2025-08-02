import pandas as pd
import os
from app.core.config import PRODUCT_DATA_PATH

def append_product_to_csv(product_data: dict):
    """
    Appends a new product row to the main product CSV file.
    Creates the file with headers if it doesn't exist.

    Args:
        product_data (dict): A dictionary representing a single product row.
                             Must contain all columns for the CSV.
    """
    file_exists = os.path.isfile(PRODUCT_DATA_PATH)
    
    # Create a DataFrame from the new product data
    new_product_df = pd.DataFrame([product_data])
    
    # If file exists, append without header. Otherwise, create with header.
    new_product_df.to_csv(
        PRODUCT_DATA_PATH, 
        mode='a', 
        header=not file_exists, 
        index=False
    )
    
    if file_exists:
        print(f"Successfully appended product with PID '{product_data.get('pid')}' to {PRODUCT_DATA_PATH}")
    else:
        print(f"Successfully created {PRODUCT_DATA_PATH} and added product with PID '{product_data.get('pid')}'")