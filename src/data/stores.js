// Tenant directory. Every name below is fictional placeholder content: swap in the real directory
// (name, category, hours, tags) and nothing else in the project needs to change.
// hours: "open-close" 24h; a close earlier than the open means "after midnight".

const MALL_H = '10:00-22:00';
const FOOD_H = '11:00-23:00';
const CAFE_H = '08:00-23:00';

export const META = {
  // ---- level 1
  maison: { name: 'Maison Verde', cat: 'fashion', line: 'Department store for fashion, home and gifts', tags: ['Department store', 'Womenswear', 'Menswear', 'Home'], kw: ['clothes', 'clothing', 'dress', 'shirt', 'jeans', 'bags', 'gifts', 'anchor'], hours: MALL_H, deal: 'Season sale · up to 40% off' },
  nordik: { name: 'Nordik Threads', cat: 'fashion', line: 'Outerwear and knitwear built for cold mornings', tags: ['Menswear', 'Outerwear', 'Knitwear'], kw: ['jacket', 'coat', 'sweater', 'hoodie', 'men', 'winter', 'clothes'], hours: MALL_H },
  orbit: { name: 'Pixel Orbit', cat: 'tech', line: 'Phones, laptops, consoles and smart-home gear', tags: ['Phones', 'Laptops', 'Gaming'], kw: ['iphone', 'android', 'computer', 'playstation', 'xbox', 'tablet', 'electronics', 'charger', 'headphones'], hours: MALL_H, deal: 'Trade-in bonus on phones' },
  aroma: { name: 'Aroma Lab', cat: 'beauty', line: 'Perfume bar and skincare with free consultations', tags: ['Perfume', 'Skincare', 'Makeup'], kw: ['fragrance', 'cologne', 'cosmetics', 'lipstick', 'moisturiser', 'beauty', 'gift'], hours: MALL_H },
  bean: { name: 'Bean & Bloom', cat: 'dining', line: 'Specialty coffee, pastries and a flower counter', tags: ['Coffee', 'Bakery', 'Florist'], kw: ['cafe', 'café', 'latte', 'espresso', 'croissant', 'tea', 'breakfast', 'flowers', 'drink'], hours: CAFE_H, deal: '2-for-1 flat whites after 3 pm' },
  fresh: { name: 'Fresh Market', cat: 'home', line: 'Full-size grocer with a bakery and a hot-food counter', tags: ['Groceries', 'Bakery', 'Deli'], kw: ['supermarket', 'food', 'vegetables', 'fruit', 'milk', 'bread', 'meat', 'anchor', 'shopping'], hours: '08:00-23:00' },
  atlas: { name: 'Little Atlas', cat: 'family', line: 'Toys, kids’ books and a free play corner', tags: ['Toys', 'Kids', 'Books'], kw: ['children', 'child', 'baby', 'lego', 'games', 'family', 'play', 'gifts'], hours: MALL_H },
  ivy: { name: 'Ivy & Oak', cat: 'home', line: 'Plants, ceramics and calm home décor', tags: ['Décor', 'Plants', 'Ceramics'], kw: ['furniture', 'candles', 'vase', 'garden', 'house', 'kitchen', 'living'], hours: MALL_H },
  atelier27: { name: 'Atelier 27', cat: 'soon', line: 'A new concept store from a local fashion house', tags: ['Opening soon'], kw: ['new', 'coming soon', 'fashion'], hours: MALL_H, soon: 'Opens in spring' },
  luna: { name: 'Luna Optics', cat: 'services', line: 'Eye tests in 20 minutes, frames and sunglasses', tags: ['Eye care', 'Glasses', 'Sunglasses'], kw: ['optician', 'optometrist', 'lenses', 'contact lenses', 'vision', 'health'], hours: MALL_H },
  olive: { name: 'Olive & Ember', cat: 'dining', line: 'Wood-fired Mediterranean grill and mezze', tags: ['Mediterranean', 'Grill', 'Family dining'], kw: ['restaurant', 'lunch', 'dinner', 'kebab', 'halal', 'seafood', 'salad', 'eat', 'food'], hours: FOOD_H },
  ramen: { name: 'Ramen Atelier', cat: 'dining', line: 'Slow-simmered broths and hand-pulled noodles', tags: ['Japanese', 'Noodles', 'Quick bite'], kw: ['restaurant', 'soup', 'asian', 'lunch', 'dinner', 'eat', 'food', 'sushi'], hours: FOOD_H, deal: 'Lunch set from 11:00' },
  sneaker: { name: 'Sneaker Lab', cat: 'fashion', line: 'Limited drops and everyday trainers', tags: ['Shoes', 'Sneakers', 'Streetwear'], kw: ['footwear', 'trainers', 'nike', 'running', 'boots', 'sport', 'clothes'], hours: MALL_H, deal: 'New drops every Friday' },
  glow: { name: 'Glow Studio', cat: 'beauty', line: 'Nails, brows and lashes by appointment or walk-in', tags: ['Nails', 'Brows', 'Salon'], kw: ['manicure', 'pedicure', 'hair', 'spa', 'wellness', 'makeup', 'beauty salon'], hours: MALL_H },
  voltix: { name: 'Voltix', cat: 'tech', line: 'Audio, wearables and smart accessories', tags: ['Audio', 'Wearables', 'Accessories'], kw: ['speaker', 'earbuds', 'watch', 'smartwatch', 'cables', 'camera', 'electronics', 'headphones'], hours: MALL_H },
  'k-sweet': { name: 'Sweet Cart', cat: 'dining', line: 'Roasted nuts, candy and chocolate by weight', tags: ['Sweets', 'Snacks'], kw: ['candy', 'chocolate', 'dessert', 'snack', 'kiosk', 'nuts', 'gift'], hours: MALL_H },
  'k-case': { name: 'Chroma Cases', cat: 'tech', line: 'Phone cases and screen protectors, fitted while you wait', tags: ['Phone cases', 'Accessories'], kw: ['kiosk', 'screen protector', 'charger', 'cable', 'phone', 'repair'], hours: MALL_H },
  'k-gift': { name: 'Gift Nook', cat: 'jewelry', line: 'Charms, keepsakes and quick gift wrapping', tags: ['Gifts', 'Accessories'], kw: ['kiosk', 'present', 'birthday', 'jewellery', 'jewelry', 'wrapping', 'souvenir'], hours: MALL_H, deal: 'Free gift wrapping' },
  'k-fix': { name: 'QuickFix', cat: 'services', line: 'Phone, watch and shoe repair while you shop', tags: ['Repairs'], kw: ['kiosk', 'phone repair', 'screen', 'battery', 'watch', 'shoe', 'key', 'tailor'], hours: MALL_H },

  // ---- level 2
  casa: { name: 'Casa Lumen', cat: 'home', line: 'Furniture, lighting and textiles for every room', tags: ['Furniture', 'Lighting', 'Textiles'], kw: ['sofa', 'bed', 'lamp', 'rug', 'curtain', 'kitchen', 'living', 'anchor', 'home'], hours: MALL_H, deal: 'Free delivery over $300' },
  gilded: { name: 'Gilded Hour', cat: 'jewelry', line: 'Fine jewellery, watches and bespoke engraving', tags: ['Jewellery', 'Watches', 'Engraving'], kw: ['gold', 'diamond', 'ring', 'necklace', 'bracelet', 'wedding', 'gift', 'silver'], hours: MALL_H },
  bao: { name: 'Bao Bar', cat: 'dining', line: 'Steamed buns and Taiwanese street snacks', tags: ['Asian', 'Street food', 'Quick bite'], kw: ['food court', 'lunch', 'snack', 'dumplings', 'eat', 'restaurant'], hours: FOOD_H },
  pita: { name: 'Pita Street', cat: 'dining', line: 'Falafel, shawarma and fresh-baked pita', tags: ['Middle Eastern', 'Quick bite', 'Vegetarian'], kw: ['food court', 'lunch', 'wrap', 'halal', 'eat', 'restaurant', 'falafel'], hours: FOOD_H },
  noodle: { name: 'Noodle Theory', cat: 'dining', line: 'Wok-fired noodles cooked in front of you', tags: ['Asian', 'Noodles', 'Quick bite'], kw: ['food court', 'lunch', 'wok', 'eat', 'restaurant', 'chinese', 'thai'], hours: FOOD_H },
  smoke: { name: 'Smoke & Fire', cat: 'dining', line: 'Burgers, ribs and slow-smoked brisket', tags: ['Burgers', 'BBQ', 'Quick bite'], kw: ['food court', 'lunch', 'steak', 'fries', 'eat', 'restaurant', 'american'], hours: FOOD_H, deal: 'Burger + fries combo' },
  skyb: { name: 'Sky Bistro', cat: 'dining', line: 'Seasonal plates with a view over the atrium', tags: ['International', 'Sit-down', 'Brunch'], kw: ['restaurant', 'dinner', 'lunch', 'brunch', 'wine', 'date', 'eat', 'food'], hours: FOOD_H },
  terrace: { name: 'Terrace Café', cat: 'dining', line: 'Garden pavilion for coffee, juices and light bites', tags: ['Café', 'Outdoor', 'Juices'], kw: ['coffee', 'garden', 'outside', 'terrace', 'tea', 'drink', 'pool', 'sky garden'], hours: '09:00-22:00' },
  play: { name: 'Play Loop', cat: 'family', line: 'Arcade, VR pods and a birthday-party room', tags: ['Arcade', 'VR', 'Parties'], kw: ['games', 'kids', 'fun', 'children', 'family', 'entertainment', 'virtual reality'], hours: '10:00-23:00', deal: 'Weekday family pass' },
  noir: { name: 'Noir Books', cat: 'soon', line: 'Independent bookshop with a reading cafe', tags: ['Opening soon'], kw: ['new', 'coming soon', 'books', 'reading'], hours: MALL_H, soon: 'Opens next month' },
  silk: { name: 'Silk Route', cat: 'fashion', line: 'Contemporary womenswear and occasion wear', tags: ['Womenswear', 'Occasion wear', 'Scarves'], kw: ['dress', 'abaya', 'wedding', 'clothes', 'fashion', 'women', 'shoes', 'bags'], hours: MALL_H, deal: 'New arrivals · 15% off' },
  cinema: { name: 'Skyline Cinema', cat: 'family', line: 'Eight screens, recliner seating and late shows', tags: ['Cinema', 'Premium screens', 'Snacks'], kw: ['movies', 'film', 'popcorn', 'tickets', 'imax', 'entertainment', 'night', 'family', 'date', 'anchor'], hours: '11:00-01:00' },
  spa: { name: 'Serene Spa', cat: 'beauty', line: 'Massage, facials and a quiet relaxation lounge', tags: ['Spa', 'Massage', 'Facials'], kw: ['wellness', 'relax', 'hammam', 'sauna', 'beauty', 'hair', 'salon', 'treatment'], hours: '10:00-22:00', deal: 'First facial 20% off' },
  tempo: { name: 'Tempo Sports', cat: 'fashion', line: 'Performance wear, trainers and fitness gear', tags: ['Sportswear', 'Shoes', 'Fitness'], kw: ['gym', 'running', 'football', 'yoga', 'sneakers', 'clothes', 'sport'], hours: MALL_H },
  'k-boba': { name: 'Boba Cart', cat: 'dining', line: 'Bubble tea, fruit teas and iced coffee', tags: ['Drinks', 'Tea'], kw: ['kiosk', 'boba', 'bubble tea', 'coffee', 'drink', 'smoothie', 'snack'], hours: '10:00-23:00' },
  'k-tech': { name: 'Tech Doctor', cat: 'services', line: 'Laptop and console repair with same-day checks', tags: ['Repairs', 'Laptops'], kw: ['kiosk', 'computer repair', 'screen', 'fix', 'data recovery', 'phone repair'], hours: MALL_H },

  // ---- facilities
  'wc-w1': { name: 'Restrooms (West)', fac: 'restroom', kw: ['toilet', 'wc', 'bathroom', 'washroom', 'baby changing', 'accessible'], hours: '10:00-22:00' },
  'wc-e1': { name: 'Restrooms (East)', fac: 'restroom', kw: ['toilet', 'wc', 'bathroom', 'washroom', 'baby changing', 'accessible'], hours: '10:00-22:00' },
  'wc-w2': { name: 'Restrooms (West)', fac: 'restroom', kw: ['toilet', 'wc', 'bathroom', 'washroom', 'baby changing', 'accessible'], hours: '10:00-22:00' },
  'wc-e2': { name: 'Restrooms (East)', fac: 'restroom', kw: ['toilet', 'wc', 'bathroom', 'washroom', 'baby changing', 'accessible'], hours: '10:00-22:00' },
  'lift-w1': { name: 'West Elevators', fac: 'lift', kw: ['lift', 'elevator', 'step-free', 'wheelchair', 'stroller', 'accessible'] },
  'lift-e1': { name: 'East Elevators', fac: 'lift', kw: ['lift', 'elevator', 'step-free', 'wheelchair', 'stroller', 'accessible'] },
  'lift-w2': { name: 'West Elevators', fac: 'lift', kw: ['lift', 'elevator', 'step-free', 'wheelchair', 'stroller', 'accessible'] },
  'lift-e2': { name: 'East Elevators', fac: 'lift', kw: ['lift', 'elevator', 'step-free', 'wheelchair', 'stroller', 'accessible'] },
  core1: { name: 'Parking Elevators', fac: 'parking', kw: ['car park', 'parking', 'garage', 'lift', 'car'] },
  core2: { name: 'Parking Elevators', fac: 'parking', kw: ['car park', 'parking', 'garage', 'lift', 'car'] },
  info: { name: 'Information Desk', fac: 'info', kw: ['help', 'lost and found', 'maps', 'gift cards', 'wheelchair', 'customer service', 'assistance'], hours: MALL_H },
  'atm-w1': { name: 'ATM', fac: 'atm', kw: ['cash', 'bank', 'money', 'withdraw'] },
  'atm-e1': { name: 'ATM', fac: 'atm', kw: ['cash', 'bank', 'money', 'withdraw'] },
  'atm-w2': { name: 'ATM', fac: 'atm', kw: ['cash', 'bank', 'money', 'withdraw'] },
  halo: { name: 'The Halo', fac: 'feature', kw: ['atrium', 'meeting point', 'sculpture', 'plaza', 'centre', 'center', 'landmark', 'chandelier'], line: 'Meeting point under the hanging sculpture' },
};
