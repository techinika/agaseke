/* eslint-disable @typescript-eslint/no-explicit-any */
export function RankRow({ rank, name, subText }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-muted-foreground w-6">#{rank}</span>
        <div>
          <p className="font-bold text-foreground">{name}</p>
        </div>
      </div>
      <p className="font-bold text-orange-600 text-sm">{subText}</p>
    </div>
  );
}
