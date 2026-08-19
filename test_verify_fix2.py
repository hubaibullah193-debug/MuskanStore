from playwright.sync_api import sync_playwright
import os
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ===== VERIFY BUG #2: Order confirmation =====
    print("=" * 80)
    print("VERIFY BUG #2: Order confirmation — was 500 errors")
    print("=" * 80)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

    resp = page.goto("http://localhost:3000/order-confirmation/test-order", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(5000)
    print(f"HTTP Status: {resp.status}")

    body = page.locator("body").inner_text()
    print(f"Body text:\n{body[:1000]}")

    h1 = page.locator("h1").inner_text() if page.locator("h1").count() > 0 else "none"
    print(f"\nH1: {h1}")

    err_msgs = [m for m in console_msgs if m.startswith("[error]")]
    if err_msgs:
        print(f"\nConsole errors ({len(err_msgs)}):")
        for e in err_msgs[:5]:
            print(f"  {e[:200]}")
    else:
        print("\nNo console errors!")

    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_order_confirmation.png"), full_page=True)
    ctx.close()

    # ===== ALSO: Verify checkout page still works =====
    print("\n" + "=" * 80)
    print("VERIFY: Checkout page (empty cart = expected)")
    print("=" * 80)
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    page2 = ctx2.new_page()
    resp2 = page2.goto("http://localhost:3000/checkout", wait_until="domcontentloaded", timeout=20000)
    page2.wait_for_timeout(3000)
    print(f"HTTP Status: {resp2.status}")
    body2 = page2.locator("body").inner_text()
    print(f"Body text:\n{body2[:500]}")
    page2.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_checkout.png"), full_page=True)
    ctx2.close()

    browser.close()

print("\nDone!")
