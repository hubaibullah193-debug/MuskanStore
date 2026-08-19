from playwright.sync_api import sync_playwright
import os
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    
    pages_to_test = [
        ("http://localhost:3000/", "verify_homepage.png", "Homepage"),
        ("http://localhost:3000/products", "verify_products.png", "Products"),
        ("http://localhost:3000/order-confirmation/test-order", "verify_order_confirm.png", "Order Confirmation"),
    ]
    
    for url, filename, label in pages_to_test:
        print(f"Testing: {label} ({url})")
        page = ctx.new_page()
        resp = page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, filename), full_page=True)
        print(f"  Status: {resp.status}")
        h1 = page.locator("h1").inner_text() if page.locator("h1").count() > 0 else "none"
        print(f"  H1: {h1}")
        page.close()
    
    ctx.close()
    browser.close()
print("Screenshots saved!")
