from playwright.sync_api import sync_playwright
import json
import os
from datetime import datetime

RESULTS = []
SCREENSHOT_DIR = "C:\\Users\\s\\Documents\\mstore\\test-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def log_result(page_name, status, details=""):
    RESULTS.append({"page": page_name, "status": status, "details": details})
    icon = "PASS" if status == "pass" else "FAIL" if status == "fail" else "WARN"
    print(f"[{icon}] {page_name}: {details[:200]}")

def test_page(page, url, name, checks=None):
    """Navigate to a page, screenshot it, and run custom checks."""
    errors = []
    console_errors = []
    
    def on_console(msg):
        if msg.type in ("error", "warning"):
            console_errors.append(f"[{msg.type}] {msg.text}")
    
    page.on("console", on_console)
    
    try:
        response = page.goto(url, wait_until="networkidle", timeout=15000)
        status_code = response.status if response else "no response"
        
        if status_code >= 500:
            log_result(name, "fail", f"Server error {status_code}")
            return
        
        if status_code == 404:
            log_result(name, "warn", f"404 Not Found")
            return
        
        page.wait_for_timeout(1500)
        
        # Screenshot
        screenshot_path = os.path.join(SCREENSHOT_DIR, f"{name.replace('/', '_').replace(' ', '_')}.png")
        page.screenshot(path=screenshot_path, full_page=True)
        
        # Get page content for analysis
        title = page.title()
        content = page.content()
        
        # Count visible elements
        buttons = page.locator("button").count()
        links = page.locator("a").count()
        inputs = page.locator("input").count()
        forms = page.locator("form").count()
        
        details = f"HTTP {status_code} | Title: '{title}' | Buttons: {buttons} | Links: {links} | Inputs: {inputs} | Forms: {forms}"
        
        # Run custom checks
        if checks:
            check_results = checks(page)
            if check_results:
                details += f" | Issues: {check_results}"
                log_result(name, "fail", details)
            else:
                log_result(name, "pass", details)
        else:
            log_result(name, "pass", details)
        
        # Log console errors
        if console_errors:
            for err in console_errors[:5]:
                log_result(name, "warn", f"Console: {err}")
        
    except Exception as e:
        log_result(name, "fail", f"Exception: {str(e)[:300]}")
    finally:
        page.remove_listener("console", on_console)

def check_signup_form(page):
    issues = []
    forms = page.locator("form").all()
    if not forms:
        issues.append("No form found on page")
        return ",".join(issues)
    
    for i, form in enumerate(forms):
        method = form.get_attribute("method")
        action = form.get_attribute("action")
        if method and method.upper() == "GET":
            issues.append(f"Form #{i+1} uses GET method (should be POST)")
        if not action:
            issues.append(f"Form #{i+1} has no action attribute")
    
    # Check for password field
    pwd = page.locator("input[type='password']")
    if pwd.count() == 0:
        issues.append("No password field found")
    
    # Check for email field
    email = page.locator("input[type='email']")
    text_email = page.locator("input[name='email']")
    if email.count() == 0 and text_email.count() == 0:
        issues.append("No email field found")
    
    # Check submit button
    submit = page.locator("button[type='submit']")
    if submit.count() == 0:
        issues.append("No submit button found")
    
    return ",".join(issues) if issues else ""

def check_login_form(page):
    issues = []
    forms = page.locator("form").all()
    if not forms:
        issues.append("No form found")
        return ",".join(issues)
    
    for i, form in enumerate(forms):
        method = form.get_attribute("method")
        if method and method.upper() == "GET":
            issues.append(f"Form uses GET (should be POST)")
    
    pwd = page.locator("input[type='password']")
    if pwd.count() == 0:
        issues.append("No password field")
    
    return ",".join(issues) if issues else ""

def check_admin_layout(page):
    issues = []
    # Check for sidebar/nav
    sidebar = page.locator("nav, aside, [class*='sidebar'], [class*='Sidebar']")
    if sidebar.count() == 0:
        issues.append("No sidebar/nav found in admin")
    
    # Check for dashboard heading
    headings = page.locator("h1, h2, h3").count()
    if headings == 0:
        issues.append("No headings found")
    
    return ",".join(issues) if issues else ""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    
    print("=" * 80)
    print("MSTORE COMPREHENSIVE PAGE AUDIT")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # 1. Homepage
    test_page(page, "http://localhost:3000", "01_homepage")
    
    # 2. Signup page
    test_page(page, "http://localhost:3000/auth/signup", "02_signup", check_signup_form)
    
    # 3. Login page
    test_page(page, "http://localhost:3000/auth/login", "03_login", check_login_form)
    
    # 4. Forgot password
    test_page(page, "http://localhost:3000/auth/forgot-password", "04_forgot_password")
    
    # 5. Reset password
    test_page(page, "http://localhost:3000/auth/reset-password", "05_reset_password")
    
    # 6. Products listing
    test_page(page, "http://localhost:3000/products", "06_products")
    
    # 7. Product detail (try with slug)
    test_page(page, "http://localhost:3000/products/sample-product", "07_product_detail")
    
    # 8. Cart page
    test_page(page, "http://localhost:3000/cart", "08_cart")
    
    # 9. Checkout page
    test_page(page, "http://localhost:3000/checkout", "09_checkout")
    
    # 10. Track order
    test_page(page, "http://localhost:3000/track-order", "10_track_order")
    
    # 11. Account page
    test_page(page, "http://localhost:3000/account", "11_account")
    
    # 12. Order confirmation (try generic ID)
    test_page(page, "http://localhost:3000/order-confirmation/test-order", "12_order_confirmation")
    
    # 13. Admin dashboard
    test_page(page, "http://localhost:3000/admin/dashboard", "13_admin_dashboard", check_admin_layout)
    
    # 14. Admin orders
    test_page(page, "http://localhost:3000/admin/orders", "14_admin_orders")
    
    # 15. Admin products
    test_page(page, "http://localhost:3000/admin/products", "15_admin_products")
    
    # 16. Admin inventory
    test_page(page, "http://localhost:3000/admin/inventory", "16_admin_inventory")
    
    # 17. Admin shipments
    test_page(page, "http://localhost:3000/admin/shipments", "17_admin_shipments")
    
    # 18. Admin refunds
    test_page(page, "http://localhost:3000/admin/refunds", "18_admin_refunds")
    
    # 19. Admin audit logs
    test_page(page, "http://localhost:3000/admin/audit-logs", "19_admin_audit_logs")
    
    # 20. Admin settings
    test_page(page, "http://localhost:3000/admin/settings", "20_admin_settings")
    
    # 21. API health checks
    test_page(page, "http://localhost:3000/api/checkout", "21_api_checkout")
    test_page(page, "http://localhost:3000/api/cart/add", "22_api_cart_add")
    test_page(page, "http://localhost:3000/api/track-order", "23_api_track_order")
    test_page(page, "http://localhost:3000/api/admin/shipments", "25_api_admin_shipments")
    test_page(page, "http://localhost:3000/api/admin/refunds", "26_api_admin_refunds")
    
    browser.close()

# Summary
print("\n" + "=" * 80)
print("AUDIT SUMMARY")
print("=" * 80)

fails = [r for r in RESULTS if r["status"] == "fail"]
warns = [r for r in RESULTS if r["status"] == "warn"]
passes = [r for r in RESULTS if r["status"] == "pass"]

print(f"PASS: {len(passes)} | FAIL: {len(fails)} | WARN: {len(warns)}")
print()

if fails:
    print("FAILURES:")
    for f in fails:
        print(f"  [{f['status'].upper()}] {f['page']}: {f['details']}")
    print()

if warns:
    print("WARNINGS:")
    for w in warns:
        print(f"  [WARN] {w['page']}: {w['details']}")

# Save results to JSON
with open(os.path.join(SCREENSHOT_DIR, "audit_results.json"), "w") as f:
    json.dump(RESULTS, f, indent=2)

print(f"\nScreenshots saved to: {SCREENSHOT_DIR}")
print(f"Full results saved to: {SCREENSHOT_DIR}/audit_results.json")
