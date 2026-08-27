-- 002_seed_sample_products.sql
-- Personal hygiene products for Muskan Care Center (Pakistan market)
-- Categories, products, variants, inventory, and product images

-- Clear existing data (safe for dev environment)
DELETE FROM public.product_images;
DELETE FROM public.product_variants;
DELETE FROM public.product_inventory;
DELETE FROM public.products;
DELETE FROM public.categories;

-- ============================================================================
-- CATEGORIES
-- ============================================================================

INSERT INTO public.categories (name, slug) VALUES
  ('Hair Care',    'hair-care'),
  ('Skin Care',    'skin-care'),
  ('Body Care',    'body-care'),
  ('Soaps',        'soaps'),
  ('Specialty',    'specialty');

-- ============================================================================
-- PRODUCTS (personal hygiene — Pakistan market, prices in PKR)
-- ============================================================================

-- Hair Care
INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Herbal Shampoo', 'herbal-shampoo',
  'Natural herbal shampoo with amla and reetha. Strengthens hair and prevents dandruff. Suitable for all hair types.',
  450, 'HC-SHP-001', id, 120, true, true
FROM public.categories WHERE slug = 'hair-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Anti-Dandruff Shampoo', 'anti-dandruff-shampoo',
  'Medicated anti-dandruff shampoo with zinc pyrithione. Controls flaking and itching with regular use.',
  520, 'HC-SHP-002', id, 95, true, true
FROM public.categories WHERE slug = 'hair-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Coconut Hair Oil', 'coconut-hair-oil',
  'Pure cold-pressed coconut oil for deep conditioning. Nourishes scalp and promotes healthy hair growth.',
  280, 'HC-OIL-001', id, 200, true, false
FROM public.categories WHERE slug = 'hair-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Hair Conditioner', 'hair-conditioner',
  'Moisturizing conditioner with argan oil. Detangles and smooths hair for easy styling.',
  380, 'HC-CND-001', id, 80, true, false
FROM public.categories WHERE slug = 'hair-care';

-- Skin Care
INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Charcoal Face Wash', 'charcoal-face-wash',
  'Deep cleansing face wash with activated charcoal. Removes impurities and unclogs pores. For oily and combination skin.',
  350, 'SC-FW-001', id, 110, true, true
FROM public.categories WHERE slug = 'skin-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Aloe Vera Moisturizer', 'aloe-vera-moisturizer',
  'Lightweight daily moisturizer with pure aloe vera gel. Hydrates without greasy residue. Suitable for all skin types.',
  420, 'SC-MST-001', id, 85, true, true
FROM public.categories WHERE slug = 'skin-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Sunscreen SPF 50', 'sunscreen-spf50',
  'Broad spectrum UV protection with SPF 50. Non-greasy formula, water resistant for up to 80 minutes.',
  650, 'SC-SUN-001', id, 70, true, false
FROM public.categories WHERE slug = 'skin-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Under Eye Cream', 'under-eye-cream',
  'Refreshing under-eye cream with vitamin E and caffeine. Reduces dark circles and puffiness with consistent use.',
  580, 'SC-EYE-001', id, 55, true, false
FROM public.categories WHERE slug = 'skin-care';

-- Body Care
INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Body Lotion', 'body-lotion',
  'Nourishing body lotion with shea butter and cocoa butter. Long-lasting moisture for dry and normal skin.',
  380, 'BC-BL-001', id, 130, true, true
FROM public.categories WHERE slug = 'body-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Roll-On Deodorant', 'roll-on-deodorant',
  '48-hour protection roll-on deodorant. Mild fragrance, alcohol-free formula gentle on sensitive skin.',
  320, 'BC-DO-001', id, 150, true, false
FROM public.categories WHERE slug = 'body-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Hand Cream', 'hand-cream',
  'Intensive hand cream with glycerin and vitamin E. Repairs dry, cracked hands. Non-greasy absorption.',
  250, 'BC-HC-001', id, 100, true, false
FROM public.categories WHERE slug = 'body-care';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Foot Cream', 'foot-cream',
  'Refreshing foot cream with menthol and tea tree oil. Softens rough skin and fights odor.',
  280, 'BC-FC-001', id, 75, true, false
FROM public.categories WHERE slug = 'body-care';

-- Soaps
INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Neem & Tulsi Soap', 'neem-tulsi-soap',
  'Traditional antibacterial soap with neem and tulsi extracts. Cleanses deeply and helps prevent skin infections.',
  150, 'SP-NE-001', id, 250, true, true
FROM public.categories WHERE slug = 'soaps';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Charcoal Detox Soap', 'charcoal-detox-soap',
  'Activated charcoal soap for deep pore cleansing. Draws out toxins and impurities. For acne-prone skin.',
  180, 'SP-CD-001', id, 180, true, false
FROM public.categories WHERE slug = 'soaps';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Rose & Glycerin Soap', 'rose-glycerin-soap',
  'Gentle glycerin soap with real rose extracts. Moisturizes while cleansing. Leaves a light floral fragrance.',
  160, 'SP-RG-001', id, 200, true, false
FROM public.categories WHERE slug = 'soaps';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Shea Butter Soap', 'shea-butter-soap',
  'Rich shea butter soap for dry and sensitive skin. Creamy lather that nourishes and protects.',
  170, 'SP-SB-001', id, 160, true, false
FROM public.categories WHERE slug = 'soaps';

-- Specialty
INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Intimate Wash', 'intimate-wash',
  'pH-balanced intimate wash with lactic acid. Gentle formula maintains natural balance. Dermatologically tested.',
  450, 'SP-IW-001', id, 90, true, false
FROM public.categories WHERE slug = 'specialty';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Scalp Treatment Serum', 'scalp-treatment-serum',
  'Concentrated scalp serum with salicylic acid and tea tree oil. Targets dandruff and itchiness at the root.',
  750, 'SP-STS-001', id, 45, true, false
FROM public.categories WHERE slug = 'specialty';

INSERT INTO public.products (name, slug, description, base_price, sku, category_id, stock_quantity, is_active, featured)
SELECT 'Lip Balm SPF 15', 'lip-balm-spf15',
  'Moisturizing lip balm with SPF 15 protection. Shea butter and coconut oil keep lips soft and protected.',
  190, 'SP-LB-001', id, 220, true, false
FROM public.categories WHERE slug = 'specialty';

-- ============================================================================
-- PRODUCT VARIANTS (scent/size variants for selected products)
-- ============================================================================

-- Herbal Shampoo variants (sizes)
INSERT INTO public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
SELECT p.id, 'HC-SHP-001-100ml', '100ml', -150, 40, true
FROM public.products p WHERE p.sku = 'HC-SHP-001'
UNION ALL
SELECT p.id, 'HC-SHP-001-250ml', '250ml (Regular)', 0, 60, true
FROM public.products p WHERE p.sku = 'HC-SHP-001'
UNION ALL
SELECT p.id, 'HC-SHP-001-500ml', '500ml (Family)', 250, 20, true
FROM public.products p WHERE p.sku = 'HC-SHP-001';

-- Anti-Dandruff Shampoo variants
INSERT INTO public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
SELECT p.id, 'HC-SHP-002-100ml', '100ml', -120, 30, true
FROM public.products p WHERE p.sku = 'HC-SHP-002'
UNION ALL
SELECT p.id, 'HC-SHP-002-200ml', '200ml', 0, 50, true
FROM public.products p WHERE p.sku = 'HC-SHP-002';

-- Charcoal Face Wash variants
INSERT INTO public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
SELECT p.id, 'SC-FW-001-50ml', '50ml', -100, 35, true
FROM public.products p WHERE p.sku = 'SC-FW-001'
UNION ALL
SELECT p.id, 'SC-FW-001-100ml', '100ml', 0, 60, true
FROM public.products p WHERE p.sku = 'SC-FW-001';

-- Neem & Tulsi Soap variants (pack sizes)
INSERT INTO public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
SELECT p.id, 'SP-NE-001-1pc', 'Single Bar', 0, 150, true
FROM public.products p WHERE p.sku = 'SP-NE-001'
UNION ALL
SELECT p.id, 'SP-NE-001-3pc', 'Pack of 3', 50, 80, true
FROM public.products p WHERE p.sku = 'SP-NE-001'
UNION ALL
SELECT p.id, 'SP-NE-001-6pc', 'Pack of 6', 120, 20, true
FROM public.products p WHERE p.sku = 'SP-NE-001';

-- Body Lotion variants (sizes)
INSERT INTO public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
SELECT p.id, 'BC-BL-001-200ml', '200ml', -80, 40, true
FROM public.products p WHERE p.sku = 'BC-BL-001'
UNION ALL
SELECT p.id, 'BC-BL-001-400ml', '400ml', 0, 60, true
FROM public.products p WHERE p.sku = 'BC-BL-001';

-- ============================================================================
-- PRODUCT INVENTORY (default stock entries)
-- ============================================================================

INSERT INTO public.product_inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
SELECT p.id, NULL, p.stock_quantity, 0, 10
FROM public.products p;

-- ============================================================================
-- PRODUCT IMAGES (using Unsplash source URLs — replace with Supabase Storage)
-- ============================================================================

-- Hair Care images
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'HC-SHP-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'HC-SHP-002';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1600428877878-1a0fd85beda8?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'HC-OIL-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'HC-CND-001';

-- Skin Care images
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.pexels.com/photos/8533228/pexels-photo-8533228.jpeg', 0
FROM public.products p WHERE p.sku = 'SC-FW-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SC-MST-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SC-SUN-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SC-EYE-001';

-- Body Care images
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.pexels.com/photos/7319145/pexels-photo-7319145.jpeg', 0
FROM public.products p WHERE p.sku = 'BC-BL-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'BC-DO-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'BC-HC-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'BC-FC-001';

-- Soaps images
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-NE-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.stockcake.com/public/d/a/d/dadf753b-4d0a-4f3f-b373-0782cc17c974_large/natural-soap-bar-stockcake.jpg', 0
FROM public.products p WHERE p.sku = 'SP-CD-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-RG-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-SB-001';

-- Specialty images
INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-IW-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-STS-001';

INSERT INTO public.product_images (product_id, image_url, display_order)
SELECT p.id, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop', 0
FROM public.products p WHERE p.sku = 'SP-LB-001';
