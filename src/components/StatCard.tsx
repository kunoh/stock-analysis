interface Props {
  label: string;
  value: string | number | null;
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1">{value ?? '-'}</p>
    </div>
  );
}
