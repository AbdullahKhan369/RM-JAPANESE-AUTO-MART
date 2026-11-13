import type {
  BodyType,
  CarStatus,
  Currency,
  DeliverTo,
  DriveType,
  FuelType,
  Rates,
  Steering,
  Transmission,
} from '@/types/database';

export const SITE_NAME = 'RM Japanese Auto Mart';
export const PAGE_SIZE = 24;
export const MAX_IMAGES = 12;
export const CURRENCY_COOKIE = 'rm_currency';

/** Standard PostgREST select to load a car with its relations. */
export const CAR_SELECT =
  '*, make:makes(id,name,slug), model:models(id,name,slug,make_id), images:car_images(*)';

export const FALLBACK_RATES: Rates = { EUR: 1, GBP: 0.86, PKR: 325 };

type Opt<T extends string = string> = { value: T; label: string };

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export const FUEL_TYPES: Opt<FuelType>[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'plug_in_hybrid', label: 'Plug-in Hybrid' },
  { value: 'electric', label: 'Electric' },
];

export const TRANSMISSIONS: Opt<Transmission>[] = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

export const BODY_TYPES: Opt<BodyType>[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'suv', label: 'SUV' },
  { value: 'crossover', label: 'Crossover' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'van', label: 'Van' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'kei', label: 'Kei car' },
  { value: 'convertible', label: 'Convertible' },
];

export const DRIVE_TYPES: Opt<DriveType>[] = [
  { value: 'fwd', label: 'FWD' },
  { value: 'rwd', label: 'RWD' },
  { value: 'awd', label: 'AWD' },
  { value: '4wd', label: '4WD' },
];

export const STEERING_OPTIONS: Opt<Steering>[] = [
  { value: 'right', label: 'Right-hand drive' },
  { value: 'left', label: 'Left-hand drive' },
];

export const COLORS: Opt[] = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'silver', label: 'Silver' },
  { value: 'grey', label: 'Grey' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'brown', label: 'Brown' },
  { value: 'beige', label: 'Beige' },
  { value: 'gold', label: 'Gold' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'other', label: 'Other' },
];

/** '' (empty string) means "not graded". */
export const AUCTION_GRADES: string[] = ['S', '6', '5', '4.5', '4', '3.5', '3', 'R', 'RA'];

export const DELIVER_TO_OPTIONS: Opt<DeliverTo>[] = [
  { value: 'ireland', label: 'Ireland' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'pakistan', label: 'Pakistan' },
];

/** Short labels used on small chips (cards). */
export const DELIVER_SHORT_LABELS: Record<DeliverTo, string> = {
  ireland: 'Ireland',
  uk: 'UK',
  pakistan: 'Pakistan',
};

export const CAR_STATUSES: Opt<CarStatus>[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'sold', label: 'Sold' },
];

export const SORT_OPTIONS: Opt[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'year_desc', label: 'Year: newest' },
  { value: 'mileage_asc', label: 'Mileage: lowest' },
];

export const COMMON_FEATURES: string[] = [
  'Air conditioning',
  'Climate control',
  'Leather seats',
  'Heated seats',
  'Sunroof',
  'Navigation',
  'Reverse camera',
  '360° camera',
  'Cruise control',
  'Adaptive cruise control',
  'Lane assist',
  'Keyless entry',
  'Push start',
  'LED headlights',
  'Alloy wheels',
  'Bluetooth',
  'Apple CarPlay / Android Auto',
  'Parking sensors',
  'Power windows',
  'Power tailgate',
  'Sliding doors',
  'Turbo',
  'ABS',
  'Airbags',
  'Dash cam',
  'ETC card',
  'Tow bar',
  'Rear spoiler',
];

export const MIN_YEAR = 1990;
export const maxYear = (): number => new Date().getFullYear() + 1;
