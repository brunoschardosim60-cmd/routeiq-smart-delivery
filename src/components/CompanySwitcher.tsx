import { Building2, ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { useCurrentCompany, companyLabel, type CompanyScope } from "@/lib/current-company";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const OPTIONS: CompanyScope[] = ["DBM", "BS", "todas"];

export function CompanySwitcher() {
  const [current, setCurrent] = useCurrentCompany();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-accent">
          <Building2 className="h-4 w-4 text-primary" />
          <div className="text-left leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Empresa</p>
            <p className="font-medium">{companyLabel(current)}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Selecionar empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt} onClick={() => setCurrent(opt)} className="text-sm cursor-pointer">
            <span className="flex-1">{companyLabel(opt)}</span>
            {current === opt && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
