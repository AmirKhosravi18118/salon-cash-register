import type { ExpenseCategory, SalonService, ServiceCategory } from './types'

const now = new Date().toISOString()
const category = (id: string, name: string, sortOrder: number): ServiceCategory => ({
  id, name, sortOrder, active: true,
})
const expenseCategory = (id: string, name: string, sortOrder: number): ExpenseCategory => ({
  id, name, sortOrder, active: true,
})
const service = (
  id: string,
  categoryId: string,
  name: string,
  duration: string,
  euros: number,
  pricingMode: 'fixed' | 'from',
  sortOrder: number,
): SalonService => ({
  id, categoryId, name, duration,
  priceCents: Math.round(euros * 100),
  pricingMode, sortOrder, active: true,
  createdAt: now, updatedAt: now,
})

export const starterServiceCategories: ServiceCategory[] = [
  category('cut-styling', 'CUT & STYLING', 1),
  category('loreal-professionnel', "L'ORÉAL PROFESSIONNEL", 2),
  category('color-basic', 'COLOR BASIC', 3),
  category('blond-balayage', 'BLOND & BALAYAGE', 4),
  category('curl-care', 'CURL & CARE', 5),
  category('glossing', 'GLOSSING', 6),
  category('treatments-care', 'TREATMENTS & CARE', 7),
  category('beauty', 'BEAUTY', 8),
  category('p-bridal', 'P-BRIDAL', 9),
  category('extensions', 'Extensions', 10),
  category('beratung', 'BERATUNG', 11),
]

export const starterServices: SalonService[] = [
  service('cut-01','cut-styling','Waschen & Schneiden Kurz','1 Stunde',29,'fixed',1),
  service('cut-02','cut-styling','Waschen & Schneiden Mittel','1 Stunde',35,'fixed',2),
  service('cut-03','cut-styling','Waschen & Schneiden Lang','1 Stunde',39,'fixed',3),
  service('cut-04','cut-styling','Föhnen Kurz','1 Stunde',25,'fixed',4),
  service('cut-05','cut-styling','Föhnen Mittel','1 Stunde',35,'fixed',5),
  service('cut-06','cut-styling','Föhnen Lang','1 Stunde',55,'fixed',6),
  service('cut-07','cut-styling','Waschen, Schneiden & Föhnen Kurz','1 Stunde',35,'fixed',7),
  service('cut-08','cut-styling','Waschen, Schneiden & Föhnen Mittel','1 Stunde 15 Minuten',38,'fixed',8),
  service('cut-09','cut-styling','Waschen, Schneiden & Föhnen Lang','1 Stunde 30 Minuten',44,'fixed',9),
  service('cut-10','cut-styling','Locken & Styling (Finish-Look) Kurz','1 Stunde',35,'fixed',10),
  service('cut-11','cut-styling','Locken & Styling (Finish-Look) Mittel','1 Stunde',45,'fixed',11),
  service('cut-12','cut-styling','Locken & Styling (Finish-Look) Lang','1 Stunde',59,'fixed',12),

  service('lor-01','loreal-professionnel','Majirel Ansatz färben','1 Stunde',49,'from',1),
  service('lor-02','loreal-professionnel','Majirel Komplettfarbe','1 Stunde 30 Minuten',59,'from',2),
  service('lor-03','loreal-professionnel','INOA Ansatz färben','1 Stunde',59,'from',3),
  service('lor-04','loreal-professionnel','INOA komplett färben','1 Stunde 30 Minuten',69,'from',4),

  service('col-01','color-basic','Ansatz + Längen','1 Stunde',35,'from',1),
  service('col-02','color-basic','Komplettfarbe','1 Stunde 30 Minuten',40,'from',2),

  service('blo-01','blond-balayage','Face Frame Highlights','3 Stunden',119,'fixed',1),
  service('blo-02','blond-balayage','Blond-Ansatz','2 Stunden',139,'from',2),
  service('blo-03','blond-balayage','Highlights & Babyhighlights','5 Stunden',219,'from',3),
  service('blo-04','blond-balayage','Balayage','5 Stunden',239,'from',4),
  service('blo-05','blond-balayage','Luxury Blond Ritual','4 Stunden',199,'from',5),

  service('cur-01','curl-care','Dauerwelle','2 Stunden',80,'from',1),
  service('cur-02','curl-care',"L'Oréal Curl & Care",'2 Stunden',99,'from',2),

  service('glo-01','glossing','Basic Glossing','30 Minuten',39,'from',1),
  service('glo-02','glossing','Hyaluron Glossing Dia Light L’Oréal','1 Stunde',45,'from',2),

  service('tre-01','treatments-care','Absolut Repair','30 Minuten',25,'from',1),
  service('tre-02','treatments-care','Metal Detox','30 Minuten',25,'from',2),
  service('tre-03','treatments-care','Vitamino Color','30 Minuten',25,'from',3),
  service('tre-04','treatments-care','Blondifier','30 Minuten',25,'from',4),
  service('tre-05','treatments-care','Keratin Anti-Frizz','5 Stunden',259,'from',5),
  service('tre-06','treatments-care','Botox','2 Stunden 30 Minuten',149,'from',6),

  service('bea-01','beauty','Augenbrauen zupfen','30 Minuten',10,'fixed',1),
  service('bea-02','beauty','Augenbrauen färben','30 Minuten',10,'fixed',2),
  service('bea-03','beauty','Wimpern färben','30 Minuten',20,'fixed',3),
  service('bea-04','beauty','Abend-Make-up','1 Stunde',79,'from',4),
  service('bea-05','beauty','Gesichtshaarentfernung','30 Minuten',20,'from',5),
  service('bea-06','beauty','Hochsetzen','1 Stunde',79,'from',6),

  service('bri-01','p-bridal','Standesamt-Styling','2 Stunden',199,'from',1),
  service('bri-02','p-bridal','Braut Hairstyling','30 Minuten',149,'from',2),
  service('bri-03','p-bridal','Braut Make-up','30 Minuten',149,'from',3),
  service('bri-04','p-bridal','Brautpaket (Hair & Make-up)','5 Stunden',299,'from',4),

  service('ext-01','extensions','Tape-In Extensions','2 Stunden',230,'from',1),
  service('ext-02','extensions','Volume Extensions','5 Stunden',360,'from',2),

  service('ber-01','beratung','Farbberatung & Haaranalyse','30 Minuten',25,'fixed',1),
]

export const starterExpenseCategories: ExpenseCategory[] = [
  expenseCategory('material','خرید رنگ و مواد',1),
  expenseCategory('consumables','محصولات و لوازم مصرفی',2),
  expenseCategory('rent','اجاره',3),
  expenseCategory('energy','آب، برق و انرژی',4),
  expenseCategory('internet','اینترنت و تلفن',5),
  expenseCategory('cleaning','نظافت',6),
  expenseCategory('equipment','تجهیزات و ابزار',7),
  expenseCategory('repairs','تعمیرات',8),
  expenseCategory('marketing','تبلیغات',9),
  expenseCategory('transport','حمل‌ونقل',10),
  expenseCategory('bank','واریز به بانک',11),
  expenseCategory('other','سایر هزینه‌ها',12),
]
