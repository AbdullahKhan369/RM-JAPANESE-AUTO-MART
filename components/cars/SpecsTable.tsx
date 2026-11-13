import {
  BODY_TYPES,
  COLORS,
  DRIVE_TYPES,
  FUEL_TYPES,
  STEERING_OPTIONS,
  TRANSMISSIONS,
} from '@/lib/constants';
import { formatCc, formatKm, optionLabel } from '@/lib/format';
import type { CarWithRelations } from '@/types/database';

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '–' : String(value);
}

export function SpecsTable({ car }: { car: CarWithRelations }) {
  const rows: [string, string][] = [
    ['Make', text(car.make?.name)],
    ['Model', text(car.model?.name)],
    ['Version', text(car.version)],
    ['Year', text(car.year)],
    ['Mileage', formatKm(car.mileage_km)],
    ['Fuel', optionLabel(FUEL_TYPES, car.fuel_type)],
    ['Transmission', optionLabel(TRANSMISSIONS, car.transmission)],
    ['Engine capacity', formatCc(car.engine_cc)],
    ['Body type', optionLabel(BODY_TYPES, car.body_type)],
    ['Colour', optionLabel(COLORS, car.color)],
    ['Drive', optionLabel(DRIVE_TYPES, car.drive_type)],
    ['Steering', optionLabel(STEERING_OPTIONS, car.steering)],
    ['Auction grade', text(car.auction_grade)],
    ['Doors', text(car.doors)],
    ['Seats', text(car.seats)],
  ];

  return (
    <dl className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
            index % 2 === 0 ? 'bg-muted/40' : ''
          } sm:[&:nth-child(4n+3)]:bg-muted/40 sm:[&:nth-child(4n+4)]:bg-transparent`}
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
