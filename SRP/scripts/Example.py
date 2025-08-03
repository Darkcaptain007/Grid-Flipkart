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
        'product_url': 'https://www.flipkart.com/lenovo-legion-7i-intel-core-i7-10th-gen-10875h-16-gb-1-tb-ssd-windows-10-home-8-gb-graphics-nvidia-geforce-rtx-2080-super-max-q-81yu0029in-gaming-laptop/p/itm48b72e2122ecd',
        'product_name': 'Lenovo Legion 7i Intel Core i7 10th Gen 10875H - (16 GB/1 TB SSD/Windows 10 Home/8 GB Graphics/NVIDIA GeForce RTX 2080 Super Max-Q) 81YU0029IN Gaming Laptop  (15.6 inch, Slate Grey, 2.25 kg, With MS Office)',
        'product_category_tree': 'Home > Computers > Laptops > Lenovo Laptops',
        'pid': 'COMFTPG2HYSS9TW3', # Our unique Product ID
        'retail_price': '₹2,79,890',
        'discounted_price': '₹2,79,890',
        'image': 'https://rukminim2.flixcart.com/image/416/416/kdyus280/computer/t/w/3/lenovo-na-gaming-laptop-original-imafuqwpncg3bzhx.jpeg?q=70&crop=false',
        'description': 'If gaming is your favorite activity, then you need the Lenovo Legion 7i 15IMHg05 Gaming Laptop for on-the-move gaming. This gaming laptop features a 39.62 cm (15.6) FHD IPS Display with the Dolby Vision HDR and 100% AdobeRGB color gamut for rich and detailed visuals. Also, for a lag-free gaming experience, it is powered by a 10th Gen Intel Core processor and 16 GB of RAM. To top it off, you will get a one-month subscription to the Xbox Game Pass on the purchase of this laptop, so you can access over 100 high-quality PC games on Windows 10 devices.',
        'product_rating': '3.5',
        'brand': 'Lenovo',
        'product_specifications': "[{'key': 'Sales Package', 'value': 'Laptop, Power Adaptor, User Guide, Warranty Documents'}, {'key': 'Model Number', 'value': '81YU0029IN'}, {'key': 'Part Number', 'value': '81YU002AIN'}, {'key': 'Series', 'value': 'Legion 7i'}, {'key': 'Color', 'value': 'Slate Grey'}, {'key': 'Type', 'value': 'Gaming Laptop'}, {'key': 'Suitable For', 'value': 'Gaming'}, {'key': 'Battery Backup', 'value': 'Upto 6 hours'}, {'key': 'Power Supply', 'value': '230 W AC Adapter'}, {'key': 'MS Office Provided', 'value': 'Yes'}, {'key': 'Dedicated Graphic Memory Type', 'value': 'GDDR6'}, {'key': 'Dedicated Graphic Memory Capacity', 'value': '8 GB'}, {'key': 'Processor Brand', 'value': 'Intel'}, {'key': 'Processor Name', 'value': 'Core i7'}, {'key': 'Processor Generation', 'value': '10th Gen'}, {'key': 'SSD', 'value': 'Yes'}, {'key': 'SSD Capacity', 'value': '1 TB'}, {'key': 'RAM', 'value': '16 GB'}, {'key': 'RAM Type', 'value': 'DDR4'}, {'key': 'Processor Variant', 'value': '10875H'}, {'key': 'Chipset', 'value': 'Intel HM470'}, {'key': 'Clock Speed', 'value': '2.3 GHz with Turbo Boost Upto 5.1 GHz'}, {'key': 'Memory Slots', 'value': '2 Slots'}, {'key': 'Expandable Memory', 'value': 'Upto 32 GB'}, {'key': 'RAM Frequency', 'value': '3200 MHz'}, {'key': 'Cache', 'value': '16 MB'}, {'key': 'Graphic Processor', 'value': 'NVIDIA GeForce RTX 2080 Super Max-Q'}, {'key': 'Number of Cores', 'value': '8'}, {'key': 'Storage Type', 'value': 'SSD'}, {'key': 'OS Architecture', 'value': '64 bit'}, {'key': 'Operating System', 'value': 'Windows 10 Home'}, {'key': 'System Architecture', 'value': '64 bit'}, {'key': 'Mic In', 'value': 'Yes'}, {'key': 'RJ45', 'value': 'Yes'}, {'key': 'USB Port', 'value': '1 x USB 3.1 ((1st Gen) (Always On)), 2 x USB 3.1 (2nd Gen), 1 x USB 3.1 Type C ((1st Gen) (with the Function of Display 1.4)), 1 x USB 3.1 Type C (2nd Gen) / Thunderbolt 3 (with the Function of DP 1.4)'}, {'key': 'HDMI Port', 'value': '1 x HDMI Port (v2.0)'}, {'key': 'Touchscreen', 'value': 'No'}, {'key': 'Screen Size', 'value': '39.62 cm (15.6 inch)'}, {'key': 'Screen Resolution', 'value': '1920 x 1080 Pixel'}, {'key': 'Screen Type', 'value': 'Full HD LED Backlit Anti-glare WVA Display (16:9 Aspect Ratio, 500 nits Brightness, 144 Hz Refresh Rate, 100% Adobe RGB Gamut, HDR400, Dolby Vision, G-Sync Support)'}, {'key': 'Speakers', 'value': 'Built-in Dual Speakers'}, {'key': 'Internal Mic', 'value': 'Dual Array Microphone'}, {'key': 'Sound Properties', 'value': '2 x 2 W Stereo Speakers with Dolby Atoms'}, {'key': 'Wireless LAN', 'value': 'IEEE 802.11ax (Wi-Fi 6)'}, {'key': 'Bluetooth', 'value': 'v5.0'}, {'key': 'Ethernet', 'value': '100/1000 Mbps'}, {'key': 'Dimensions', 'value': '359.34 x 259.04 x 19.9 mm'}, {'key': 'Weight', 'value': '2.25 kg'}, {'key': 'Disk Drive', 'value': 'Not Available'}, {'key': 'Web Camera', 'value': '720P HD Webcam'}, {'key': 'Finger Print Sensor', 'value': 'No'}, {'key': 'Security Chip', 'value': 'TPM 2.0'}, {'key': 'Keyboard', 'value': 'English RGB LED Backlit Keyboard'}, {'key': 'Backlit Keyboard', 'value': 'Yes'}, {'key': 'Pointer Device', 'value': 'Multi-touch Touchpad'}, {'key': 'Included Software', 'value': 'Microsoft Office Home and Student 2019'}, {'key': 'Additional Features', 'value': '80 WHr Li-ion Battery'}, {'key': 'Warranty Summary', 'value': '3 Years Warranty + 1 Year Legion Ultimate Support + 1 Year ADP'}, {'key': 'Warranty Service Type', 'value': 'Onsite'}, {'key': 'Covered in Warranty', 'value': '(1) Manufacturer’s warranty against faulty workmanship or defective parts; (2) ADP-Single repair once in year against all Liquid spills, unintentional bump and drops, electric surge, cracks on screen; (3) Gamer centric support 24x7 on call support, Software support in case of HDD failure'}, {'key': 'Not Covered in Warranty', 'value': '(1) Any kind of physical damage including electrical surge; (2) No software coverage in warranty; (3) Premium Care & ADP- Not covered in case of Theft, fire, rain, flood and part alteration'}, {'key': 'Domestic Warranty', 'value': '3 Year'}]",
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