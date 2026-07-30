export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[11px] font-bold tracking-tight text-background">
        AF
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        App Forge
      </span>
    </div>
  );
}
