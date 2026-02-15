-- Migration to populate available Drink Brands
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- POPULATE DRINK BRANDS
-- ============================================================================

INSERT INTO drink_brands (name, category, base_price, description, image_url, is_available) VALUES
  ('Old Monk', 'rum', 280, 'The legend of monks. Dark rum.', '/images/drinks/Old Monk.jfif', true),
  ('Bacardi', 'rum', 300, 'Premium white rum.', '/images/drinks/Bacardi.jfif', true),
  ('Mansion House', 'other', 350, 'Original French Brandy.', '/images/drinks/Manssionhouse.jfif', true),
  ('Kingfisher', 'beer', 180, 'The King of Good Times.', '/images/drinks/Kingfisher Beer.jfif', true),
  ('Budweiser', 'beer', 220, 'King of Beers.', '/images/drinks/Budweiser Beer.jfif', true),
  ('Tuborg', 'beer', 190, 'Open for fun.', '/images/drinks/Tuborg Beer.jpg', true),
  ('Carlsberg', 'beer', 210, 'Probably the best beer in the world.', '/images/drinks/Carlsberg Beer.jfif', true),
  ('Simba', 'beer', 200, 'Roar with every sip.', '/images/drinks/Simba Beer.jfif', true),
  ('Bullet', 'beer', 180, 'Strong beer for strong men.', '/images/drinks/Bullet Beer.jfif', true),
  ('Brocode', 'beer', 150, 'Sparkling wine cooler.', '/images/drinks/Brocode Beer.jfif', true),
  ('Juno', 'vodka', 250, 'Premium Vodka.', '/images/drinks/Juno.jfif', true)
ON CONFLICT DO NOTHING;

SELECT 'Drink brands populated successfully!' as status;
