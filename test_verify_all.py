from playwright.sync_api import sync_playwright
import os, urllib.request
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def warm(path):
    try:
        urllib.request.urlopen(f"http://localhost:3000{path}", timeout=30)
        print(f"  Warmed {path}")
    except Exception as e:
        print(f"  Failed to warm {path}: {e}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ===== VERIFY BUG #1: Products page =====
    print("=" * 80)
    print("VERIFY BUG #1: Products page - was HTTP 500")
    print("=" * 80)
    
    warm("/products")
    
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

    resp = page.goto("http://localhost:3000/products", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(4000)
    print(f"HTTP Status: {resp.status}")

    body = page.locator("body").inner_text()
    print(f"Body text (first 600):\n{body[:600]}")

    cards = page.locator("[data-testid='product-card']").count()
    h1_text = page.locator("h1").inner_text() if page.locator("h1").count() > 0 else "none"
    imgs = page.locator("img").count()
    print(f"\nH1: {h1_text}")
    print(f"Product cards: {cards}")
    print(f"Images: {imgs}")

    err_msgs = [m for m in console_msgs if m.startswith("[error]")]
    if err_msgs:
        print(f"\nConsole errors ({len(err_msgs)}):")
        for e in err_msgs[:5]:
            print(f"  {e[:200]}")
    else:
        print("\nNo console errors!")

    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_products.png"), full_page=True)
    print(f"PASS" if resp.status == 200 and cards > 0 else "FAIL")
    ctx.close()

    # ===== VERIFY BUG #2: Order confirmation =====
    print("\n" + "=" * 80)
    print("VERIFY BUG #2: Order confirmation - was 500 errors")
    print("=" * 80)
    
    warm("/order-confirmation/test-order")
    
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    page2 = ctx2.new_page()
    console_msgs2 = []
    page2.on("console", lambda msg: console_msgs2.append(f"[{msg.type}] {msg.text}"))

    resp2 = page2.goto("http://localhost:3000/order-confirmation/test-order", wait_until="domcontentloaded", timeout=60000)
    page2.wait_for_timeout(4000)
    print(f"HTTP Status: {resp2.status}")

    body2 = page2.locator("body").inner_text()
    print(f"Body text (first 600):\n{body2[:600]}")

    h1_2 = page2.locator("h1").inner_text() if page2.locator("h1").count() > 0 else "none"
    print(f"\nH1: {h1_2}")

    err_msgs2 = [m for m in console_msgs2 if m.startswith("[error]")]
    if err_msgs2:
        print(f"\nConsole errors ({len(err_msgs2)}):")
        for e in err_msgs2[:5]:
            print(f"  {e[:200]}")
    else:
        print("\nNo console errors!")

    page2.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_order_confirmation.png"), full_page=True)
    print(f"PASS" if resp2.status == 200 else "FAIL")
    ctx2.close()

    # ===== VERIFY: Homepage still works =====
    print("\n" + "=" * 80)
    print("VERIFY: Homepage still works")
    print("=" * 80)
    warm("/")
    ctx3 = browser.new_context(viewport={"width": 1280, "height": 900})
    page3 = ctx3.new_page()
    resp3 = page3.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=60000)
    page3.wait_for_timeout(3000)
    print(f"HTTP Status: {resp3.status}")
    featured = page3.locator("#featured").inner_text()[:300] if page3.locator("#featured").count() > 0 else "not found"
    print(f"Featured section: {featured}")
    page3.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_homepage.png"), full_page=True)
    ctx3.close()

    browser.close()

print("\nAll done!")
