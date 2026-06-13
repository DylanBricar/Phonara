import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

type AnimateChangeInHeightProps = {
  children: ReactNode;
  className?: string;
};

export const AnimateChangeInHeight = ({
  children,
  className,
}: AnimateChangeInHeightProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className={cn(className, "overflow-hidden")}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, ease: "easeIn" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

export type FilterOption = {
  name: string;
  icon?: ReactNode;
  label?: string;
};

export type FilterDefinition = {
  type: string;
  icon: ReactNode;
  options: FilterOption[];
  operators?: string[];
  multiOperators?: string[];
};

export type Filter = {
  id: string;
  type: string;
  operator: string;
  value: string[];
};

const FilterOperatorDropdown = ({
  operators,
  operator,
  setOperator,
}: {
  operators: string[];
  operator: string;
  setOperator: (operator: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-muted hover:bg-muted/50 text-muted-foreground hover:text-primary shrink-0 px-1.5 py-1 transition">
        {operator}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem key={op} onClick={() => setOperator(op)}>
            {op}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FilterValueCombobox = ({
  filterType,
  options,
  filterValues,
  setFilterValues,
}: {
  filterType: string;
  options: FilterOption[];
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const nonSelectedOptions = options.filter(
    (opt) => !filterValues.includes(opt.name),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => setCommandInput(""), 200);
        }
      }}
    >
      <PopoverTrigger className="bg-muted hover:bg-muted/50 text-muted-foreground hover:text-primary shrink-0 rounded-none px-1.5 py-1 transition">
        <div className="flex items-center gap-1.5">
          <div className="flex flex-row items-center -space-x-1.5">
            <AnimatePresence mode="popLayout">
              {filterValues.slice(0, 3).map((value) => {
                const opt = options.find((o) => o.name === value);
                return opt?.icon ? (
                  <motion.div
                    key={value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {opt.icon}
                  </motion.div>
                ) : null;
              })}
            </AnimatePresence>
          </div>
          {filterValues.length === 1
            ? filterValues[0]
            : `${filterValues.length} selected`}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={filterType}
              className="h-9"
              value={commandInput}
              onInputCapture={(e) => setCommandInput(e.currentTarget.value)}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filterValues.map((value) => {
                  const opt = options.find((o) => o.name === value);
                  return (
                    <CommandItem
                      key={value}
                      className="group flex items-center gap-2"
                      onSelect={() => {
                        setFilterValues(
                          filterValues.filter((v) => v !== value),
                        );
                        setTimeout(() => setCommandInput(""), 200);
                        setOpen(false);
                      }}
                    >
                      <Checkbox checked={true} />
                      {opt?.icon}
                      {value}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {nonSelectedOptions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {nonSelectedOptions.map((filter) => (
                      <CommandItem
                        className="group flex items-center gap-2"
                        key={filter.name}
                        value={filter.name}
                        onSelect={(currentValue) => {
                          setFilterValues([...filterValues, currentValue]);
                          setTimeout(() => setCommandInput(""), 200);
                          setOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          className="opacity-0 group-data-[selected=true]:opacity-100"
                        />
                        {filter.icon}
                        <span className="text-accent-foreground">
                          {filter.name}
                        </span>
                        {filter.label && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            {filter.label}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

export default function Filters({
  filters,
  setFilters,
  definitions,
}: {
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
  definitions: Record<string, FilterDefinition>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters
        .filter((filter) => filter.value.length > 0)
        .map((filter) => {
          const def = definitions[filter.type];

          const operators =
            filter.value.length > 1
              ? (def.multiOperators ?? def.operators ?? [])
              : (def.operators ?? []);

          return (
            <div
              key={filter.id}
              className="flex items-center gap-[1px] text-xs"
            >
              <div className="bg-muted flex shrink-0 items-center gap-1.5 rounded-l px-1.5 py-1">
                {def.icon}
                {filter.type}
              </div>
              <FilterOperatorDropdown
                operators={operators}
                operator={filter.operator}
                setOperator={(operator) => {
                  setFilters((prev) =>
                    prev.map((f) =>
                      f.id === filter.id ? { ...f, operator } : f,
                    ),
                  );
                }}
              />
              <FilterValueCombobox
                filterType={filter.type}
                options={def.options}
                filterValues={filter.value}
                setFilterValues={(filterValues) => {
                  setFilters((prev) =>
                    prev.map((f) =>
                      f.id === filter.id ? { ...f, value: filterValues } : f,
                    ),
                  );
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFilters((prev) => prev.filter((f) => f.id !== filter.id));
                }}
                className="bg-muted hover:bg-muted/50 text-muted-foreground hover:text-primary size-6 shrink-0 rounded-l-none rounded-r-sm transition"
              >
                <X className="size-3" />
              </Button>
            </div>
          );
        })}
    </div>
  );
}
