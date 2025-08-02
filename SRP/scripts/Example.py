import pandas as pd
import sys
from pathlib import Path
import subprocess # To call our other script

# Add project root to path to import utils
sys.path.append(str(Path(__file__).resolve().parent.parent))

from scripts.utils import append_product_to_csv
from app.core.config import PRODUCT_DATA_PATH

def main():
    """
    Demonstrates the full workflow of adding a new product.
    1. Defines a new product.
    2. Appends it to the master CSV.
    3. Calls the script to index it via the API.
    """
    print("--- Starting New Product Addition Workflow ---")

    # --- 1. Define the New Product Data ---
    # Let's add a new, high-end laptop. The PID should be unique.
    new_laptop = {
        'product_url': 'https://www.flipkart.com/new-gaming-laptop-pro/p/itm_fake_pid_laptop',
        'product_name': 'Aura Gaming Laptop Pro X1 (2025 Edition)',
        'product_category_tree': 'Home > Computers > Laptops',
        'pid': 'LAPTOPPROX1GAMING', # Our unique Product ID
        'retail_price': '₹1,50,000',
        'discounted_price': '₹1,35,000',
        'image': 'https://example.com/laptop.jpg',
        'description': 'Experience next-generation gaming with the Aura Pro X1. Features a powerful new CPU, top-tier graphics card, and a stunning 16-inch QHD display with a 240Hz refresh rate. Perfect for competitive gamers and content creators.',
        'product_rating': '4.8',
        'brand': 'Aura',
        'product_specifications': '[{\'key\': \'Model Name\', \'value\': \'Gaming Laptop Pro X1\'}]',
        'category': 'Computers',
        'subcategory': 'Laptops'
    }
    print(f"\nStep 1: Defined new product with PID: '{new_laptop['pid']}'")

    # --- 2. Append the New Product to the Master CSV ---
    print(f"\nStep 2: Appending new product to '{PRODUCT_DATA_PATH.name}'...")
    try:
        append_product_to_csv(new_laptop)
    except Exception as e:
        print(f"  ERROR: Failed to append to CSV. Reason: {e}")
        return

    # --- 3. Call the `add_new_product.py` Script to Index via API ---
    print("\nStep 3: Calling the API script to push the new product to the search index...")
    
    # We use subprocess to call our other script, passing the new PID as an argument.
    # This simulates running it from the command line.
    script_path = "scripts/add_new_product.py"
    pid_to_add = new_laptop['pid']
    
    try:
        # We run 'python' and then the script path and the argument.
        # `check=True` will raise an error if the script fails.
        # `capture_output=True` and `text=True` let us see the script's output.
        result = subprocess.run(
            [sys.executable, script_path, pid_to_add],
            check=True,
            capture_output=True,
            text=True
        )
        print("  --- Output from add_new_product.py ---")
        print(result.stdout)
        if result.stderr:
            print("  --- Errors from add_new_product.py ---")
            print(result.stderr)
        
        print("\n--- Workflow Complete! ---")
        print(f"Product '{pid_to_add}' has been added to the CSV and sent to the search index.")
        print("You can now test searching for 'Aura Gaming Laptop' using the client script.")

    except FileNotFoundError:
        print(f"  ERROR: Could not find the script at '{script_path}'. Make sure you are in the project root.")
    except subprocess.CalledProcessError as e:
        print(f"  ERROR: The '{script_path}' script failed to execute.")
        print("  --- Script Output (stdout) ---")
        print(e.stdout)
        print("  --- Script Errors (stderr) ---")
        print(e.stderr)

if __name__ == "__main__":
    main()