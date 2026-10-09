/**
 * Starter menu templates per business type.
 *
 * These run on BOTH sides: the client uses them for instant local seeding while
 * offline, and the server uses them to materialise the tenant catalogue at
 * profile-setup time. Prices are whole rupiah (integer), never floats.
 */

export type BusinessTypeKey = "seblak" | "minuman" | "ayam" | "sate" | "warung" | "lainnya";

export type TemplateOption = {
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
};

export type TemplateGroup = {
  name: string;
  multiple?: boolean;
  required?: boolean;
  options: TemplateOption[];
};

export type TemplateItem = {
  name: string;
  basePrice: number;
  glyph: string;
  groups?: TemplateGroup[];
};

export type TemplateCategory = {
  name: string;
  emoji: string;
  items: TemplateItem[];
};

export type BusinessTemplate = {
  key: BusinessTypeKey;
  label: string;
  tagline: string;
  /** two-stop gradient used for tiles / onboarding cards */
  accent: [string, string];
  ink: string;
  categories: TemplateCategory[];
};

function levelGroup(levels = 5, label = "Level Pedas"): TemplateGroup {
  return {
    name: label,
    required: true,
    options: Array.from({ length: levels }, (_, i) => ({
      name: `Level ${i + 1}`,
      priceAdjustment: 0,
      isDefault: i === 1,
    })),
  };
}

const toppingAddons = (items: [string, number][]): TemplateGroup => ({
  name: "Topping",
  multiple: true,
  required: false,
  options: items.map(([name, priceAdjustment], i) => ({ name, priceAdjustment, isDefault: i === -1 })),
});

export const BUSINESS_TEMPLATES: Record<BusinessTypeKey, BusinessTemplate> = {
  seblak: {
    key: "seblak",
    label: "Seblak / Makanan Pedas",
    tagline: "Level pedas, topping, kerupuk & ceker",
    accent: ["#D6402C", "#8E1F16"],
    ink: "#FFF3EE",
    categories: [
      {
        name: "Seblak",
        emoji: "🌶️",
        items: [
          {
            name: "Seblak Original",
            basePrice: 12000,
            glyph: "🍜",
            groups: [
              { name: "Porsi", options: [{ name: "Kecil", priceAdjustment: -2000 }, { name: "Biasa", priceAdjustment: 0, isDefault: true }, { name: "Besar", priceAdjustment: 4000 }] },
              levelGroup(),
              toppingAddons([["Ceker", 5000], ["Bakso", 3000], ["Sosis", 3000], ["Kerupuk", 2000], ["Kwangtung", 3000], ["Telur", 2500]]),
            ],
          },
          {
            name: "Seblak Ceker",
            basePrice: 15000,
            glyph: "🐔",
            groups: [levelGroup(), toppingAddons([["Bakso", 3000], ["Sosis", 3000], ["Kerupuk", 2000], ["Keju", 4000]])],
          },
          {
            name: "Seblak Komplit",
            basePrice: 18000,
            glyph: "🥘",
            groups: [levelGroup(), toppingAddons([["Ceker", 5000], ["Bakso", 3000], ["Keju", 4000]])],
          },
          { name: "Seblak Mie Gelas", basePrice: 13000, glyph: "🍝", groups: [levelGroup()] },
          { name: "Seblak Kuah (Tanpa Nasi)", basePrice: 14000, glyph: "🥣", groups: [levelGroup()] },
        ],
      },
      {
        name: "Minuman",
        emoji: "🥤",
        items: [
          { name: "Es Teh Manis", basePrice: 4000, glyph: "🧋" },
          { name: "Es Jeruk", basePrice: 6000, glyph: "🍊" },
          { name: "Teh Hangat", basePrice: 3000, glyph: "🍵" },
        ],
      },
    ],
  },

  minuman: {
    key: "minuman",
    label: "Minuman (Boba, Kopi, Jus)",
    tagline: "Ukuran, level manis, topping",
    accent: ["#7A4E2D", "#3B2417"],
    ink: "#FFF6EC",
    categories: [
      {
        name: "Boba & Milk Tea",
        emoji: "🧋",
        items: [
          {
            name: "Boba Brown Sugar",
            basePrice: 15000,
            glyph: "🧋",
            groups: [
              { name: "Ukuran", options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }, { name: "Large", priceAdjustment: 4000 }] },
              { name: "Level Manis", required: true, options: [{ name: "25%", priceAdjustment: 0 }, { name: "50%", priceAdjustment: 0 }, { name: "75%", priceAdjustment: 0, isDefault: true }, { name: "100%", priceAdjustment: 0 }] },
              toppingAddons([["Boba Extra", 3000], ["Jelly", 2000], ["Pudding", 2000], ["Cheese Foam", 5000], ["Grass Jelly", 2000]]),
              { name: "Es", options: [{ name: "Normal Ice", priceAdjustment: 0, isDefault: true }, { name: "Less Ice", priceAdjustment: 0 }, { name: "No Ice", priceAdjustment: 0 }] },
            ],
          },
          {
            name: "Thai Tea",
            basePrice: 10000,
            glyph: "🥤",
            groups: [
              { name: "Ukuran", options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }, { name: "Large", priceAdjustment: 3000 }] },
              { name: "Level Manis", options: [{ name: "50%", priceAdjustment: 0 }, { name: "75%", priceAdjustment: 0, isDefault: true }, { name: "100%", priceAdjustment: 0 }] },
              toppingAddons([["Boba", 3000], ["Jelly", 2000]]),
            ],
          },
          { name: "Matcha Latte", basePrice: 15000, glyph: "🍵", groups: [{ name: "Ukuran", options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }, { name: "Large", priceAdjustment: 4000 }] }] },
        ],
      },
      {
        name: "Kopi",
        emoji: "☕",
        items: [
          {
            name: "Es Kopi Susu Gula Aren",
            basePrice: 13000,
            glyph: "☕",
            groups: [
              { name: "Ukuran", options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }, { name: "Large", priceAdjustment: 4000 }] },
              { name: "Level Manis", options: [{ name: "Kurang", priceAdjustment: 0 }, { name: "Pas", priceAdjustment: 0, isDefault: true }, { name: "Manis", priceAdjustment: 0 }] },
              toppingAddons([["Extra Shot", 4000], ["Pudding", 2000]]),
            ],
          },
          { name: "Kopi Hitam", basePrice: 6000, glyph: "🖤" },
          { name: "Cappuccino", basePrice: 14000, glyph: "☕", groups: [{ name: "Suhu", options: [{ name: "Panas", priceAdjustment: 0, isDefault: true }, { name: "Dingin", priceAdjustment: 0 }] }] },
        ],
      },
      {
        name: "Jus & Sehat",
        emoji: "🍹",
        items: [
          { name: "Jus Alpukat", basePrice: 13000, glyph: "🥑", groups: [{ name: "Ukuran", options: [{ name: "Regular", priceAdjustment: 0, isDefault: true }, { name: "Large", priceAdjustment: 3000 }] }] },
          { name: "Jus Mangga", basePrice: 12000, glyph: "🥭" },
          { name: "Es Jeruk Peras", basePrice: 8000, glyph: "🍊" },
        ],
      },
    ],
  },

  ayam: {
    key: "ayam",
    label: "Ayam / Gorengan",
    tagline: "Bagian ayam, level pedas, paket nasi",
    accent: ["#C9852B", "#7A4A0F"],
    ink: "#FFF7E8",
    categories: [
      {
        name: "Ayam",
        emoji: "🍗",
        items: [
          {
            name: "Ayam Geprek",
            basePrice: 15000,
            glyph: "🍗",
            groups: [
              { name: "Bagian", required: true, options: [{ name: "Dada", priceAdjustment: 0, isDefault: true }, { name: "Paha", priceAdjustment: 2000 }, { name: "Sayap", priceAdjustment: 3000 }] },
              levelGroup(),
              toppingAddons([["Nasi Putih", 4000], ["Es Teh Manis", 3000], ["Sambal Bawang", 2000], ["Kerupuk", 1000]]),
            ],
          },
          {
            name: "Ayam Goreng Kremes",
            basePrice: 13000,
            glyph: "🍛",
            groups: [
              { name: "Bagian", required: true, options: [{ name: "Dada", priceAdjustment: 0, isDefault: true }, { name: "Paha", priceAdjustment: 2000 }, { name: "Fillet", priceAdjustment: 3000 }] },
              toppingAddons([["Nasi Putih", 4000], ["Es Teh Manis", 3000], ["Sambal Extra", 2000]]),
            ],
          },
          { name: "Ayam Bakar Bumbu Rujak", basePrice: 17000, glyph: "🔥", groups: [{ name: "Bagian", options: [{ name: "Dada", priceAdjustment: 0, isDefault: true }, { name: "Paha", priceAdjustment: 2000 }] }] },
          { name: "Kentang Goreng", basePrice: 10000, glyph: "🍟" },
        ],
      },
      {
        name: "Snack & Minum",
        emoji: "🥤",
        items: [
          { name: "Tahu/Tempe Goreng (3 pcs)", basePrice: 6000, glyph: "🫘" },
          { name: "Es Teh Manis", basePrice: 4000, glyph: "🧋" },
          { name: "Nasi Putih", basePrice: 4000, glyph: "🍚" },
        ],
      },
    ],
  },

  sate: {
    key: "sate",
    label: "Sate / Bakar-bakaran",
    tagline: "Per tusuk, bumbu, lontong",
    accent: ["#8C4A22", "#4A2110"],
    ink: "#FFF4E9",
    categories: [
      {
        name: "Sate",
        emoji: "🍢",
        items: [
          {
            name: "Sate Ayam",
            basePrice: 25000,
            glyph: "🍢",
            groups: [
              { name: "Jumlah Tusuk", required: true, options: [{ name: "5 tusuk", priceAdjustment: -10000 }, { name: "10 tusuk", priceAdjustment: 0, isDefault: true }, { name: "15 tusuk", priceAdjustment: 12000 }, { name: "20 tusuk", priceAdjustment: 24000 }] },
              { name: "Bumbu", required: true, options: [{ name: "Kacang", priceAdjustment: 0, isDefault: true }, { name: "Kecap-Cabe", priceAdjustment: 0 }, { name: "Lumbung (Rawon)", priceAdjustment: 3000 }] },
              toppingAddons([["Lontong", 5000], ["Nasi Putih", 4000], ["Tusuk Extra Bumbu", 2000]]),
            ],
          },
          {
            name: "Sate Kambing",
            basePrice: 35000,
            glyph: "🐐",
            groups: [
              { name: "Jumlah Tusuk", required: true, options: [{ name: "5 tusuk", priceAdjustment: -12000 }, { name: "10 tusuk", priceAdjustment: 0, isDefault: true }, { name: "15 tusuk", priceAdjustment: 18000 }] },
              { name: "Bumbu", options: [{ name: "Kecap", priceAdjustment: 0, isDefault: true }, { name: "Kuah Kacang", priceAdjustment: 0 }] },
            ],
          },
          { name: "Sate Padang", basePrice: 25000, glyph: "🥜", groups: [{ name: "Jumlah Tusuk", options: [{ name: "10 tusuk", priceAdjustment: 0, isDefault: true }, { name: "15 tusuk", priceAdjustment: 12000 }] }] },
          { name: "Sate Taichan", basePrice: 22000, glyph: "🌶️", groups: [levelGroup(3, "Level Sambal"), toppingAddons([["Lontong", 5000], ["Nasi", 4000]])] },
        ],
      },
      {
        name: "Bakar Lain & Minum",
        emoji: "🔥",
        items: [
          { name: "Bakaran Jamur Tiram", basePrice: 12000, glyph: "🍄" },
          { name: "Es Teh Manis", basePrice: 4000, glyph: "🧋" },
          { name: "Air Mineral", basePrice: 4000, glyph: "💧" },
        ],
      },
    ],
  },

  warung: {
    key: "warung",
    label: "Warung Makan / Nasi",
    tagline: "Nasi rames, lauk, minuman",
    accent: ["#2E6F52", "#12402C"],
    ink: "#F0FAF4",
    categories: [
      {
        name: "Nasi & Lauk",
        emoji: "🍛",
        items: [
          {
            name: "Nasi Rames / Campur",
            basePrice: 12000,
            glyph: "🍛",
            groups: [
              { name: "Lauk", required: true, options: [{ name: "Ayam Goreng", priceAdjustment: 3000, isDefault: true }, { name: "Lele", priceAdjustment: 0 }, { name: "Ender", priceAdjustment: 0 }, { name: "Rendang", priceAdjustment: 8000 }, { name: "Tahu/Tempe", priceAdjustment: -4000 }] },
              toppingAddons([["Telur Dadar", 3000], ["Sayur Asem", 3000], ["Sambal Extra", 2000], ["Kerupuk", 1000]]),
            ],
          },
          {
            name: "Ayam Geprek + Nasi",
            basePrice: 15000,
            glyph: "🍗",
            groups: [levelGroup(), toppingAddons([["Es Teh Manis", 3000], ["Telur Dadar", 3000]])],
          },
          {
            name: "Nasi Goreng Kampung",
            basePrice: 14000,
            glyph: "🍳",
            groups: [toppingAddons([["Telur Mata Sapi", 3000], ["Bakso", 4000]])],
          },
          { name: "Sayur Lodeh", basePrice: 6000, glyph: "🥬" },
        ],
      },
      {
        name: "Minuman",
        emoji: "🥤",
        items: [
          { name: "Es Teh Manis", basePrice: 4000, glyph: "🧋" },
          { name: "Teh Hangat", basePrice: 2000, glyph: "🍵" },
          { name: "Es Jeruk", basePrice: 6000, glyph: "🍊" },
          { name: "Kopi Sachet", basePrice: 4000, glyph: "☕" },
        ],
      },
      {
        name: "Snack Tambahan",
        emoji: "🍤",
        items: [
          { name: "Gorengan (5 pcs)", basePrice: 5000, glyph: "🥟" },
          { name: "Rendang Tahu", basePrice: 5000, glyph: "🫘" },
        ],
      },
    ],
  },

  lainnya: {
    key: "lainnya",
    label: "Lainnya (Custom)",
    tagline: "Mulai dari nol, atur sendiri menunya",
    accent: ["#4F46A7", "#241D5C"],
    ink: "#F3F1FF",
    categories: [
      {
        name: "Makanan",
        emoji: "🍽️",
        items: [
          { name: "Menu Utama 1", basePrice: 12000, glyph: "🍽️" },
          { name: "Menu Utama 2", basePrice: 15000, glyph: "🥘" },
        ],
      },
      {
        name: "Minuman",
        emoji: "🥤",
        items: [
          { name: "Es Teh Manis", basePrice: 4000, glyph: "🧋" },
          { name: "Air Mineral", basePrice: 4000, glyph: "💧" },
        ],
      },
    ],
  },
};

export const BUSINESS_TYPE_ORDER: BusinessTypeKey[] = ["seblak", "minuman", "ayam", "sate", "warung", "lainnya"];

export function getTemplate(key: string | null | undefined): BusinessTemplate {
  return BUSINESS_TEMPLATES[(key as BusinessTypeKey) ?? "lainnya"] ?? BUSINESS_TEMPLATES.lainnya;
}

export type FlattenedTemplateItem = {
  name: string;
  basePrice: number;
  glyph: string;
  categoryName: string;
  categoryEmoji: string;
  groups: { name: string; multiple: boolean; required: boolean; options: TemplateOption[] }[];
};

export function flattenTemplate(key: string | null | undefined): FlattenedTemplateItem[] {
  const tpl = getTemplate(key);
  return tpl.categories.flatMap((c) =>
    c.items.map((i) => ({
      name: i.name,
      basePrice: i.basePrice,
      glyph: i.glyph,
      categoryName: c.name,
      categoryEmoji: c.emoji,
      groups: (i.groups ?? []).map((g) => ({
        name: g.name,
        multiple: g.multiple ?? false,
        required: g.required ?? true,
        options: g.options,
      })),
    })),
  );
}
