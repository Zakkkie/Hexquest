import fs from 'fs';

let content = fs.readFileSync('rules/items.ts', 'utf8');

const replacements = [
  { name: 'Iron Plate', type: 'ARMOR' },
  { name: 'Steel Plate', type: 'ARMOR' },
  { name: 'Titanium Suit', type: 'ARMOR' },
  { name: 'Leather Boots', type: 'BOOTS' },
  { name: 'Speed Boots', type: 'BOOTS' },
  { name: 'Silver Ring', type: 'RING' },
  { name: 'Ruby Ring', type: 'RING' },
  { name: 'Emerald Necklace', type: 'NECKLACE' },
  { name: 'Diamond Necklace', type: 'NECKLACE' },
  { name: 'Light Armor', type: 'ARMOR' },
  { name: 'Plate Armor', type: 'ARMOR' },
  { name: 'Heavy Armor', type: 'ARMOR' },
  { name: 'Leather Shoes', type: 'BOOTS' },
  { name: 'Swift Boots', type: 'BOOTS' },
  { name: 'Gold Ring', type: 'RING' },
  { name: 'Gem Necklace', type: 'NECKLACE' },
  { name: 'Iron Helmet', type: 'HELMET' },
  { name: 'Banana', type: 'FOOD' },
  { name: 'Fresh Bread', type: 'FOOD' },
  { name: 'Energy Potion', type: 'POTION' },
  { name: 'Ruby', type: 'GEM' },
  { name: 'Gold Bar', type: 'BAR' },
  { name: 'Scrap Visor', type: 'HELMET' },
  { name: 'Ablative Armor', type: 'ARMOR' },
  { name: 'Rusty Dagger', type: 'DAGGER' },
  { name: 'Steel Dagger', type: 'DAGGER' },
  { name: 'Poisoned Dagger', type: 'DAGGER' },
  { name: 'Soldier Sword', type: 'SWORD' },
  { name: 'Knight Sword', type: 'SWORD' },
  { name: 'Woodcutter Axe', type: 'AXE' },
  { name: 'Battle Axe', type: 'AXE' },
  { name: 'Iron Mace', type: 'MACE' },
  { name: 'Heavy Mace', type: 'MACE' },
  { name: 'Simple Spear', type: 'SPEAR' },
  { name: 'Mage Staff', type: 'STAFF' },
  { name: 'Short Bow', type: 'BOW' },
  { name: 'Plasma Gun', type: 'GUN' },
  { name: 'Golden Sword', type: 'SWORD' },
  { name: 'Brass Knuckles', type: 'FIST' },
  { name: 'Throwing Knife', type: 'THROWING' },
  { name: 'Ancient Grimoire', type: 'BOOK' },
  { name: 'Heavy Plate Armor', type: 'ARMOR' },
  { name: 'Royal Guardian Plate', type: 'ARMOR' },
  { name: 'Elite Knight Sword', type: 'SWORD' },
  { name: 'Blue Potion', type: 'POTION' },
  { name: 'Red Potion', type: 'POTION' },
  { name: 'Fresh Cherries', type: 'FOOD' },
  { name: 'Warm Bread', type: 'FOOD' },
  { name: 'Silver Necklace', type: 'NECKLACE' },
  { name: 'Iron Axe', type: 'AXE' },
  { name: 'Mining Pickaxe', type: 'AXE' },
  { name: 'Energy Crystal', type: 'GEM' },
  { name: 'Knight Helmet', type: 'HELMET' },
  { name: 'Fire Essence', type: 'GEM' }
];

for (const rep of replacements) {
  const regex = new RegExp(`(name: { EN: '${rep.name}'.*?\\n\\s*description: .*?\\n\\s*visualType: ')[^']+(')`, 'g');
  content = content.replace(regex, `$1${rep.type}$2`);
}

fs.writeFileSync('rules/items.ts', content);
