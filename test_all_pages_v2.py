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
    print(f"[{icon}] {page_name}: {details[:300]}")

def test_page(browser, url, name, checks=None):
    """Test a page with a fresh context to avoid navigation conflicts."""
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    console_msgs = []
    
    def on_console(msg):
        console_msgs.append(f"[{msg.type}] {msg.text}")
    
    page.on("console", on_console)
    
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=20000)
        status_code = response.status if response else "no response"
        
        # Wait a bit for client-side rendering
        page.wait_for_timeout(3000)
        
        final_url = page.url
        
        # Screenshot
        screenshot_path = os.path.join(SCREENSHOT_DIR, f"{name.replace('/', '_').replace(' ', '_')}.png")
        page.screenshot(path=screenshot_path, full_page=True)
        
        title = page.title()
        
        # Check for redirect
        redirected = final_url != url
        redirect_note = f" -> REDIRECTED to {final_url}" if redirected else ""
        
        # Count elements
        buttons = page.locator("button").count()
        links = page.locator("a").count()
        inputs = page.locator("input").count()
        forms = page.locator("form").count()
        headings = page.locator("h1, h2, h3").count()
        
        # Check for error messages on page
        error_text = ""
        error_el = page.locator("[class*='error'], [role='alert'], .text-red, [class*='Error']")
        if error_el.count() > 0:
            error_text = f" | Error element found: {error_el.first.inner_text()[:100]}"
        
        details = f"HTTP {status_code}{redirect_note} | Title: '{title}' | H:{headings} B:{buttons} L:{links} I:{inputs} F:{forms}{error_text}"
        
        # Console errors
        err_msgs = [m for m in console_msgs if m.startswith("[error]")]
        if err_msgs:
            details += f" | Console errors: {len(err_msgs)}"
            for e in err_msgs[:3]:
                details += f"\n    {e[:150]}"
        
        # Custom checks
        if checks:
            check_result = checks(page, final_url)
            if check_result:
                details += f" | CHECK ISSUES: {check_result}"
                log_result(name, "fail", details)
                context.close()
                return
        
        if redirected:
            # Redirects are expected for auth pages when not logged in
            if "login" in final_url and "admin" in url:
                log_result(name, "warn", f"Redirected to login (expected for unauth): {redirect_note}")
            else:
                log_result(name, "warn", details)
        elif status_code >= 500:
            log_result(name, "fail", details)
        else:
            log_result(name, "pass", details)
            
    except Exception as e:
        log_result(name, "fail", f"Exception: {str(e)[:300]}")
    finally:
        try:
            page.remove_listener("console", on_console)
        except:
            pass
        context.close()

def check_signup(page, final_url):
    issues = []
    if "signup" not in final_url.lower():
        return ""  # redirected away, not a signup issue
    
    forms = page.locator("form").all()
    if not forms:
        issues.append("No form found")
        return ",".join(issues)
    
    for i, form in enumerate(forms):
        method = form.get_attribute("method")
        if method and method.upper() == "GET":
            issues.append(f"Form #{i+1} uses GET instead of POST")
    
    if page.locator("input[type='password']").count() == 0:
        issues.append("No password field")
    if page.locator("input[name='email'], input[type='email']").count() == 0:
        issues.append("No email field")
    if page.locator("button[type='submit'], button").count() == 0:
        issues.append("No submit button")
    
    return ",".join(issues) if issues else ""

def check_login(page, final_url):
    issues = []
    if "login" not in final_url.lower():
        return ""
    
    forms = page.locator("form").all()
    if not forms:
        issues.append("No form found")
    
    for form in forms:
        method = form.get_attribute("method")
        if method and method.upper() == "GET":
            issues.append("Form uses GET")
    
    if page.locator("input[type='password']").count() == 0:
        issues.append("No password field")
    
    return ",".join(issues) if issues else ""

def check_admin(page, final_url):
    issues = []
    if "admin" not in final_url.lower() and "login" not in final_url.lower():
        return ""
    
    if "login" in final_url.lower():
        return ""  # expected redirect
    
    sidebar = page.locator("nav, aside, [class*='sidebar'], [class*='Sidebar']")
    if sidebar.count() == 0:
        issues.append("No sidebar/nav in admin")
    
    return ",".join(issues) if issues else ""

def check_checkout(page, final_url):
    issues = []
    if "checkout" not in final_url.lower():
        return ""
    
    # Check for payment methods
    content = page.content().lower()
    has_cod = "cod" in content or "cash on delivery" in content or "cash_on_delivery" in content
    has_jazzcash = "jazzcash" in content or "jazz cash" in content
    has_easypaisa = "easypaisa" in content or "easy paisa" in content
    
    if not has_cod and not has_jazzcash and not has_easypaisa:
        issues.append("No payment methods visible")
    
    if page.locator("form").count() == 0:
        issues.append("No checkout form found")
    
    return ",".join(issues) if issues else ""

def check_homepage(page, final_url):
    issues = []
    if page.locator("h1, h2").count() == 0:
        issues.append("No headings on homepage")
    
    # Check if products are visible
    products = page.locator("[class*='product'], [class*='Product']")
    if products.count() == 0:
        # Maybe check for any card-like elements
        cards = page.locator("[class*='card'], [class*='Card']")
        if cards.count() == 0:
            issues.append("No product cards visible")
    
    return ",".join(issues) if issues else ""


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    print("=" * 80)
    print("MSTORE COMPREHENSIVE PAGE AUDIT (v2 - fresh context per page)")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # ===== PUBLIC PAGES =====
    print("\n--- PUBLIC PAGES ---")
    test_page(browser, "http://localhost:3000/", "01_homepage", check_homepage)
    test_page(browser, "http://localhost:3000/products", "02_products")
    test_page(browser, "http://localhost:3000/products/sample-product", "03_product_detail")
    test_page(browser, "http://localhost:3000/cart", "04_cart")
    test_page(browser, "http://localhost:3000/checkout", "05_checkout", check_checkout)
    test_page(browser, "http://localhost:3000/track-order", "06_track_order")
    
    # ===== AUTH PAGES =====
    print("\n--- AUTH PAGES ---")
    test_page(browser, "http://localhost:3000/auth/signup", "07_signup", check_signup)
    test_page(browser, "http://localhost:3000/auth/login", "08_login", check_login)
    test_page(browser, "http://localhost:3000/auth/forgot-password", "09_forgot_password")
    test_page(browser, "http://localhost:3000/auth/reset-password", "10_reset_password")
    
    # ===== ACCOUNT PAGES =====
    print("\n--- ACCOUNT PAGES ---")
    test_page(browser, "http://localhost:3000/account", "11_account")
    test_page(browser, "http://localhost:3000/order-confirmation/test-order", "12_order_confirmation")
    
    # ===== ADMIN PAGES =====
    print("\n--- ADMIN PAGES ---")
    test_page(browser, "http://localhost:3000/admin/dashboard", "13_admin_dashboard", check_admin)
    test_page(browser, "http://localhost:3000/admin/orders", "14_admin_orders", check_admin)
    test_page(browser, "http://localhost:3000/admin/products", "15_admin_products", check_admin)
    test_page(browser, "http://localhost:3000/admin/inventory", "16_admin_inventory", check_admin)
    test_page(browser, "http://localhost:3000/admin/shipments", "17_admin_shipments", check_admin)
    test_page(browser, "http://localhost:3000/admin/refunds", "18_admin_refunds", check_admin)
    test_page(browser, "http://localhost:3000/admin/audit-logs", "19_admin_audit_logs", check_admin)
    test_page(browser, "http://localhost:3000/admin/settings", "20_admin_settings", check_admin)
    
    # ===== API ENDPOINTS (via fetch) =====
    print("\n--- API ENDPOINTS ---")
    api_context = browser.new_context()
    api_page = api_context.new_page()
    
    apis = [
        ("21_api_checkout", "http://localhost:3000/api/checkout"),
        ("22_api_cart_add", "http://localhost:3000/api/cart/add"),
        ("23_api_track_order", "http://localhost:3000/api/track-order"),
        ("24_api_payment_verify", "http://localhost:3000/api/payment/verify"),
        ("25_api_admin_shipments", "http://localhost:3000/api/admin/shipments"),
        ("26_api_admin_refunds", "http://localhost:3000/api/admin/refunds"),
    ]
    
    for api_name, api_url in apis:
        try:
            resp = api_page.goto(api_url, wait_until="domcontentloaded", timeout=10000)
            code = resp.status if resp else "N/A"
            body = api_page.locator("body").inner_text()[:200] if api_page.locator("body").count() > 0 else ""
            if int(code) in (401, 405):
                log_result(api_name, "pass", f"HTTP {code} (expected for unauth/GET)")
            elif int(code) >= 500:
                log_result(api_name, "fail", f"HTTP {code} | Body: {body[:100]}")
            else:
                log_result(api_name, "warn", f"HTTP {code} | Body: {body[:100]}")
        except Exception as e:
            log_result(api_name, "fail", f"Exception: {str(e)[:200]}")
    
    api_context.close()
    browser.close()

# ===== SUMMARY =====
print("\n" + "=" * 80)
print("AUDIT SUMMARY")
print("=" * 80)

fails = [r for r in RESULTS if r["status"] == "fail"]
warns = [r for r in RESULTS if r["status"] == "warn"]
passes = [r for r in RESULTS if r["status"] == "pass"]

print(f"\nTOTAL: {len(RESULTS)} | PASS: {len(passes)} | FAIL: {len(fails)} | WARN: {len(warns)}")

if fails:
    print(f"\n{'='*40} FAILURES ({len(fails)}) {'='*40}")
    for f in fails:
        print(f"\n  FAIL: {f['page']}")
        print(f"  {f['details']}")

if warns:
    print(f"\n{'='*40} WARNINGS ({len(warns)}) {'='*40}")
    for w in warns:
        print(f"\n  WARN: {w['page']}")
        print(f"  {w['details']}")

if passes:
    print(f"\n{'='*40} PASSES ({len(passes)}) {'='*40}")
    for p in passes:
        print(f"  PASS: {p['page']}")

# Save results
with open(os.path.join(SCREENSHOT_DIR, "audit_results.json"), "w") as f:
    json.dump(RESULTS, f, indent=2)

print(f"\nScreenshots: {SCREENSHOT_DIR}")
print(f"Results JSON: {SCREENSHOT_DIR}/audit_results.json")
