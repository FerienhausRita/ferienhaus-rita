interface OccupancyStatsProps {
  data: {
    apartmentName: string;
    rate: number;
    occupiedNights: number;
    totalNights: number;
  }[];
}

export default function OccupancyStats({ data }: OccupancyStatsProps) {
  return (
    <div className="space-y-4">
      {data.map((apt) => (
        <div key={apt.apartmentName}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-stone-700">
              {apt.apartmentName}
            </span>
            <span className="text-sm font-semibold text-stone-900">
              {apt.rate}%
            </span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(apt.rate, 1)}%`,
                background: "linear-gradient(90deg, #5a9a6e, #3b6b4a)",
              }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {apt.occupiedNights} von {apt.totalNights} Nächten
          </p>
        </div>
      ))}
    </div>
  );
}
