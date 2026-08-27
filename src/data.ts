import type { ExpenseCategory, Service, ServiceCategory, ThemeSettings } from './types'

const now = () => new Date().toISOString()

export const defaultTheme: ThemeSettings = {
  primary: '#422d28',
  secondary: '#d995a6',
  background: '#f5ebe4',
  surface: '#fffaf6',
  text: '#382824',
  muted: '#7f6b65',
  sidebar: '#422d28',
  success: '#44765c',
  danger: '#a44955',
  radius: 24,
  shadow: 18,
  blur: 22,
  surfaceOpacity: 86,
  backgroundImage: '',
  backgroundOpacity: 22,
}

const categoryNames = [
  'CUT & STYLING',
  "L'ORÉAL PROFESSIONNEL",
  'COLOR BASIC',
  'BLOND & BALAYAGE',
  'CURL & CARE',
  'GLOSSING',
  'TREATMENTS & CARE',
  'BEAUTY',
  'P-BRIDAL',
  'Extensions',
  'BERATUNG',
]

export const initialServiceCategories: ServiceCategory[] = categoryNames.map((name, index) => ({
  id: `cat-${index + 1}`,
  name,
  order: index + 1,
  active: true,
}))

type SeedService = [number, string, number, number, 'fixed' | 'from']

const seedServices: SeedService[] = [
  [1, 'Waschen & Schneiden Kurz', 60, 2900, 'fixed'],
  [1, 'Waschen & Schneiden Mittel', 60, 3500, 'fixed'],
  [1, 'Waschen & Schneiden Lang', 60, 3900, 'fixed'],
  [1, 'Föhnen Kurz', 60, 2500, 'fixed'],
  [1, 'Föhnen Mittel', 60, 3500, 'fixed'],
  [1, 'Föhnen Lang', 60, 5500, 'fixed'],
  [1, 'Waschen, Schneiden & Föhnen Kurz', 60, 3500, 'fixed'],
  [1, 'Waschen, Schneiden & Föhnen Mittel', 75, 3800, 'fixed'],
  [1, 'Waschen, Schneiden & Föhnen Lang', 90, 4400, 'fixed'],
  [1, 'Locken & Styling (Finish-Look) Kurz', 60, 3500, 'fixed'],
  [1, 'Locken & Styling (Finish-Look) Mittel', 60, 4500, 'fixed'],
  [1, 'Locken & Styling (Finish-Look) Lang', 60, 5900, 'fixed'],

  [2, 'Majirel Ansatz färben', 60, 4900, 'from'],
  [2, 'Majirel Komplettfarbe', 90, 5900, 'from'],
  [2, 'INOA Ansatz färben', 60, 5900, 'from'],
  [2, 'INOA komplett färben', 90, 6900, 'from'],

  [3, 'Ansatz + Längen', 60, 3500, 'from'],
  [3, 'Komplettfarbe', 90, 4000, 'from'],

  [4, 'Face Frame Highlights', 180, 11900, 'fixed'],
  [4, 'Blond-Ansatz', 120, 13900, 'from'],
  [4, 'Highlights & Babyhighlights', 300, 21900, 'from'],
  [4, 'Balayage', 300, 23900, 'from'],
  [4, 'Luxury Blond Ritual', 240, 19900, 'from'],

  [5, 'Dauerwelle', 120, 8000, 'from'],
  [5, "L'Oréal Curl & Care", 120, 9900, 'from'],

  [6, 'Basic Glossing', 30, 3900, 'from'],
  [6, "Hyaluron Glossing Dia Light L’Oréal", 60, 4500, 'from'],

  [7, 'Absolut Repair', 30, 2500, 'from'],
  [7, 'Metal Detox', 30, 2500, 'from'],
  [7, 'Vitamino Color', 30, 2500, 'from'],
  [7, 'Blondifier', 30, 2500, 'from'],
  [7, 'Keratin Anti-Frizz', 300, 25900, 'from'],
  [7, 'Botox', 150, 14900, 'from'],

  [8, 'Augenbrauen zupfen', 30, 1000, 'fixed'],
  [8, 'Augenbrauen färben', 30, 1000, 'fixed'],
  [8, 'Wimpern färben', 30, 2000, 'fixed'],
  [8, 'Abend-Make-up', 60, 7900, 'from'],
  [8, 'Gesichtshaarentfernung', 30, 2000, 'from'],
  [8, 'Hochsetzen', 60, 7900, 'from'],

  [9, 'Standesamt-Styling', 120, 19900, 'from'],
  [9, 'Braut Hairstyling', 30, 14900, 'from'],
  [9, 'Braut Make-up', 30, 14900, 'from'],
  [9, 'Brautpaket (Hair & Make-up)', 300, 29900, 'from'],

  [10, 'Tape-In Extensions', 120, 23000, 'from'],
  [10, 'Volume Extensions', 300, 36000, 'from'],

  [11, 'Farbberatung & Haaranalyse', 30, 2500, 'fixed'],
]

export const initialServices: Service[] = seedServices.map(
  ([categoryNumber, name, durationMinutes, priceCents, priceMode], index) => ({
    id: `service-${index + 1}`,
    categoryId: `cat-${categoryNumber}`,
    name,
    durationMinutes,
    priceCents,
    priceMode,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  }),
)

const expenseNames = [
  'خرید رنگ و مواد',
  'محصولات و لوازم مصرفی',
  'اجاره',
  'آب، برق و انرژی',
  'اینترنت و تلفن',
  'نظافت',
  'تجهیزات و ابزار',
  'تعمیرات',
  'تبلیغات',
  'حمل‌ونقل',
  'واریز به بانک',
  'سایر هزینه‌ها',
]

export const initialExpenseCategories: ExpenseCategory[] = expenseNames.map((name, index) => ({
  id: `expense-${index + 1}`,
  name,
  order: index + 1,
  active: true,
}))
