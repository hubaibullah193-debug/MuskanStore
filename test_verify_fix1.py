from playwright.sync_api import sync_playwright
import os
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ===== VERIFY BUG #1: Products page =====
    print("=" * 80)
    print("VERIFY BUG #1: Products page — was HTTP 500")
    print("=" * 80)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

    resp = page.goto("http://localhost:3000/products", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(5000)
    print(f"HTTP Status: {resp.status}")

    body = page.locator("body").inner_text()
    print(f"Body text (first 800):\n{body[:800]}")

    # Count product cards
    cards = page.locator("[data-testid='product-card']").count()
    h1 = page.locator("h1").inner_text() if page.locator("h1").count() > 0 else "none"
    imgs = page.locator("img").count()
    print(f"\nH1: {h1}")
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
    ctx.close()

    # ===== VERIFY BUG #1: Homepage still works =====
    print("\n" + "=" * 80)
    print("VERIFY: Homepage still works after fix")
    print("=" * 80)
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    page2 = ctx2.new_page()
    resp2 = page2.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=20000)
    page2.wait_for_timeout(3000)
    print(f"HTTP Status: {resp2.status}")
    featured = page2.locator("#featured").inner_text()[:300] if page2.locator("#featured").count() > 0 else "not found"
    print(f"Featured section: {featured}")
    page2.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_homepage.png"), full_page=True)
    ctx2.close()

    browser.close()

print("\nDone! Check test-screenshots/verify_*.png")
