from playwright.sync_api import sync_playwright
import json, os
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # ===== DEBUG HOMEPAGE =====
    print("=" * 80)
    print("DEBUG: HOMEPAGE - Why no product cards?")
    print("=" * 80)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=20000)
    page.wait_for_timeout(5000)
    
    # Check featured products section
    featured_section = page.locator("#featured")
    if featured_section.count() > 0:
        text = featured_section.inner_text()
        print(f"Featured section text: {text[:500]}")
    
    # Get full page text
    body_text = page.locator("body").inner_text()
    print(f"\nFull page text (first 1500 chars):\n{body_text[:1500]}")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_homepage.png"), full_page=True)
    ctx.close()
    
    # ===== DEBUG PRODUCTS PAGE (500 error) =====
    print("\n" + "=" * 80)
    print("DEBUG: PRODUCTS PAGE - HTTP 500")
    print("=" * 80)
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    page2 = ctx2.new_page()
    console_msgs = []
    page2.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
    
    resp = page2.goto("http://localhost:3000/products", wait_until="domcontentloaded", timeout=20000)
    page2.wait_for_timeout(5000)
    print(f"Response status: {resp.status}")
    
    body_text2 = page2.locator("body").inner_text()
    print(f"\nBody text:\n{body_text2[:2000]}")
    
    # Check for Next.js error overlay
    error_overlay = page2.locator("[id*='nextjs'], [class*='nextjs'], nextjs-portal")
    if error_overlay.count() > 0:
        print(f"\nNext.js error overlay detected!")
        overlay_text = error_overlay.first.inner_text()
        print(f"Overlay text: {overlay_text[:1000]}")
    
    print(f"\nConsole messages:")
    for msg in console_msgs:
        print(f"  {msg[:200]}")
    
    page2.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_products.png"), full_page=True)
    ctx2.close()
    
    # ===== DEBUG CHECKOUT PAGE =====
    print("\n" + "=" * 80)
    print("DEBUG: CHECKOUT PAGE - No form/payment visible")
    print("=" * 80)
    ctx3 = browser.new_context(viewport={"width": 1280, "height": 900})
    page3 = ctx3.new_page()
    console_msgs3 = []
    page3.on("console", lambda msg: console_msgs3.append(f"[{msg.type}] {msg.text}"))
    
    resp3 = page3.goto("http://localhost:3000/checkout", wait_until="domcontentloaded", timeout=20000)
    page3.wait_for_timeout(5000)
    print(f"Response status: {resp3.status}")
    
    body_text3 = page3.locator("body").inner_text()
    print(f"\nBody text:\n{body_text3[:2000]}")
    
    # Check what elements are present
    forms = page3.locator("form").count()
    inputs = page3.locator("input").count()
    buttons = page3.locator("button").count()
    print(f"\nForms: {forms}, Inputs: {inputs}, Buttons: {buttons}")
    
    print(f"\nConsole messages:")
    for msg in console_msgs3:
        print(f"  {msg[:200]}")
    
    page3.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_checkout.png"), full_page=True)
    ctx3.close()
    
    # ===== DEBUG ORDER CONFIRMATION (500 errors in console) =====
    print("\n" + "=" * 80)
    print("DEBUG: ORDER CONFIRMATION - 500 console errors")
    print("=" * 80)
    ctx4 = browser.new_context(viewport={"width": 1280, "height": 900})
    page4 = ctx4.new_page()
    console_msgs4 = []
    page4.on("console", lambda msg: console_msgs4.append(f"[{msg.type}] {msg.text}"))
    
    resp4 = page4.goto("http://localhost:3000/order-confirmation/test-order", wait_until="domcontentloaded", timeout=20000)
    page4.wait_for_timeout(5000)
    print(f"Response status: {resp4.status}")
    
    body_text4 = page4.locator("body").inner_text()
    print(f"\nBody text:\n{body_text4[:2000]}")
    
    print(f"\nConsole messages:")
    for msg in console_msgs4:
        print(f"  {msg[:200]}")
    
    page4.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_order_confirmation.png"), full_page=True)
    ctx4.close()
    
    # ===== TEST SIGNUP FORM SUBMISSION =====
    print("\n" + "=" * 80)
    print("DEBUG: SIGNUP FORM - Check form method and submission")
    print("=" * 80)
    ctx5 = browser.new_context(viewport={"width": 1280, "height": 900})
    page5 = ctx5.new_page()
    page5.goto("http://localhost:3000/auth/signup", wait_until="domcontentloaded", timeout=20000)
    page5.wait_for_timeout(3000)
    
    # Check form attributes
    forms5 = page5.locator("form").all()
    for i, form in enumerate(forms5):
        method = form.get_attribute("method")
        action = form.get_attribute("action")
        print(f"Form #{i+1}: method={method}, action={action}")
    
    # Check all inputs
    inputs5 = page5.locator("input").all()
    for inp in inputs5:
        name = inp.get_attribute("name")
        type_ = inp.get_attribute("type")
        print(f"  Input: name={name}, type={type_}")
    
    # Check submit button
    submit5 = page5.locator("button[type='submit']")
    print(f"Submit buttons: {submit5.count()}")
    if submit5.count() > 0:
        print(f"Submit button text: {submit5.first.inner_text()}")
    
    # Fill and try to submit
    page5.fill("input[name='name']", "Test User")
    page5.fill("input[name='email']", "test@example.com")
    page5.fill("input[name='password']", "TestPass123")
    page5.fill("input[name='passwordConfirm']", "TestPass123")
    
    print("\nForm filled. Ready to submit.")
    page5.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_signup_filled.png"), full_page=True)
    ctx5.close()
    
    # ===== TEST LOGIN FORM =====
    print("\n" + "=" * 80)
    print("DEBUG: LOGIN FORM")
    print("=" * 80)
    ctx6 = browser.new_context(viewport={"width": 1280, "height": 900})
    page6 = ctx6.new_page()
    page6.goto("http://localhost:3000/auth/login", wait_until="domcontentloaded", timeout=20000)
    page6.wait_for_timeout(3000)
    
    forms6 = page6.locator("form").all()
    for i, form in enumerate(forms6):
        method = form.get_attribute("method")
        action = form.get_attribute("action")
        print(f"Form #{i+1}: method={method}, action={action}")
    
    inputs6 = page6.locator("input").all()
    for inp in inputs6:
        name = inp.get_attribute("name")
        type_ = inp.get_attribute("type")
        print(f"  Input: name={name}, type={type_}")
    
    submit6 = page6.locator("button[type='submit']")
    print(f"Submit buttons: {submit6.count()}")
    if submit6.count() > 0:
        print(f"Submit button text: {submit6.first.inner_text()}")
    
    ctx6.close()
    
    # ===== TEST ADMIN REDIRECT =====
    print("\n" + "=" * 80)
    print("DEBUG: ADMIN REDIRECT CHAIN")
    print("=" * 80)
    ctx7 = browser.new_context(viewport={"width": 1280, "height": 900})
    page7 = ctx7.new_page()
    resp7 = page7.goto("http://localhost:3000/admin/dashboard", wait_until="domcontentloaded", timeout=20000)
    page7.wait_for_timeout(3000)
    final_url = page7.url
    print(f"Admin dashboard -> redirected to: {final_url}")
    print(f"Status: {resp7.status}")
    body7 = page7.locator("body").inner_text()
    print(f"Body text: {body7[:500]}")
    page7.screenshot(path=os.path.join(SCREENSHOT_DIR, "debug_admin_redirect.png"), full_page=True)
    ctx7.close()
    
    browser.close()

print("\nDone! Check test-screenshots/debug_*.png for visual inspection.")
