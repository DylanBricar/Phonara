import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GripHorizontalIcon, GripIcon, Loader2Icon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDebugPanelStore } from "./debug-panel-store";

const STORAGE_KEY = "debug-panel-state";
const MIN_WIDTH = 240;
const MIN_HEIGHT = 150;
const DEFAULT_WIDTH = 288;
const DEFAULT_HEIGHT = 300;
const DEFAULT_POSITION = { x: 16, y: 16 };

type DebugPanelState = {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

function getStoredState(): DebugPanelState {
  if (typeof window === "undefined") {
    return {
      isOpen: false,
      position: DEFAULT_POSITION,
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DebugPanelState;
    }
  } catch {
    // Ignore parse errors
  }
  return {
    isOpen: false,
    position: DEFAULT_POSITION,
    size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
  };
}

function saveState(state: DebugPanelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function BreakpointBadge({ className }: { className?: string }) {
  return (
    <div className={cn("font-mono text-xs", className)}>
      <span className="block sm:hidden">xs</span>
      <span className="hidden sm:block md:hidden">sm</span>
      <span className="hidden md:block lg:hidden">md</span>
      <span className="hidden lg:block xl:hidden">lg</span>
      <span className="hidden xl:block 2xl:hidden">xl</span>
      <span className="hidden 2xl:block">2xl</span>
    </div>
  );
}

type DebugPanelContentProps = {
  onClose: () => void;
  initialPosition: { x: number; y: number };
  initialSize: { width: number; height: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
};

function DebugPanelContent({
  onClose,
  initialPosition,
  initialSize,
  onPositionChange,
  onSizeChange,
}: DebugPanelContentProps) {
  const dragControls = useDragControls();
  const { actions, infos } = useDebugPanelStore();
  const session = useSession();
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [size, setSize] = useState(initialSize);
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });

  const handleActionClick = (action: (typeof actions)[0]) => {
    setLoadingActions((prev) => new Set([...prev, action.id]));
    void Promise.resolve(action.onClick()).finally(() => {
      setLoadingActions((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    });
  };

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      startSize.current = { ...size };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size],
  );

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    const newSize = {
      width: Math.max(MIN_WIDTH, startSize.current.width + deltaX),
      height: Math.max(MIN_HEIGHT, startSize.current.height + deltaY),
    };
    setSize(newSize);
  }, []);

  const handleResizeEnd = useCallback(
    (e: React.PointerEvent) => {
      isResizing.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      onSizeChange(size);
    },
    [size, onSizeChange],
  );

  const allInfos = [
    ...(session.data?.user
      ? [
          { id: "_user", label: "User", value: session.data.user.email },
          {
            id: "_session",
            label: "Session",
            value: `${session.data.session.id.slice(0, 8)}...`,
          },
        ]
      : [{ id: "_user", label: "User", value: "Not logged in" }]),
    ...infos,
  ];

  return (
    <motion.div
      ref={panelRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{
        opacity: 0,
        scale: 0.9,
        x: initialPosition.x,
        y: initialPosition.y,
      }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onDragEnd={() => {
        if (panelRef.current) {
          const transform = panelRef.current.style.transform;
          const match = transform.match(
            /translate(?:3d)?\(([^,]+)px,\s*([^,]+)px/,
          );
          if (match) {
            onPositionChange({
              x: parseFloat(match[1]),
              y: parseFloat(match[2]),
            });
          }
        }
      }}
      style={{ width: size.width, height: size.height }}
      className="bg-popover fixed top-0 left-0 z-50 flex flex-col rounded-lg border shadow-xl"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex shrink-0 cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontalIcon className="text-muted-foreground size-4" />
          <Typography variant="small">Debug Panel</Typography>
        </div>
        <div className="flex items-center gap-2">
          <BreakpointBadge className="bg-muted rounded px-1.5 py-0.5" />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {allInfos.length > 0 && (
          <div className="flex flex-col gap-1">
            <Typography
              variant="muted"
              className="text-xs font-medium uppercase"
            >
              Info
            </Typography>
            <div className="bg-muted/50 rounded-md p-2">
              {allInfos.map((info) => (
                <div
                  key={info.id}
                  className="flex items-center justify-between py-0.5 text-xs"
                >
                  <Typography variant="muted" className="text-xs">
                    {info.label}
                  </Typography>
                  <Typography variant="code" className="text-xs">
                    {info.value === null ? "null" : String(info.value)}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="flex flex-col gap-1">
            <Typography
              variant="muted"
              className="text-xs font-medium uppercase"
            >
              Actions
            </Typography>
            <div className="flex flex-wrap gap-1">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={
                    action.variant === "destructive" ? "destructive" : "outline"
                  }
                  onClick={() => handleActionClick(action)}
                  disabled={loadingActions.has(action.id)}
                >
                  {loadingActions.has(action.id) && (
                    <Loader2Icon className="size-3 animate-spin" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {actions.length === 0 && (
          <Typography variant="muted" className="text-center text-xs">
            No actions registered
          </Typography>
        )}
      </div>

      <div
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        className="hover:bg-muted/50 absolute right-0 bottom-0 flex size-5 cursor-se-resize items-center justify-center"
      >
        <GripIcon className="text-muted-foreground size-3 rotate-45" />
      </div>
    </motion.div>
  );
}

export function DebugPanel() {
  if (process.env.NODE_ENV === "production") return null;

  return <DebugPanelClient />;
}

// eslint-disable-next-line @typescript-eslint/promise-function-async
function DebugPanelClient() {
  const isClient = useIsClient();
  const [state, setState] = useState<DebugPanelState>(() => getStoredState());

  const updateState = useCallback((updates: Partial<DebugPanelState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      saveState(newState);
      return newState;
    });
  }, []);

  if (!isClient) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {state.isOpen && (
          <DebugPanelContent
            onClose={() => updateState({ isOpen: false })}
            initialPosition={state.position}
            initialSize={state.size}
            onPositionChange={(position) => updateState({ position })}
            onSizeChange={(size) => updateState({ size })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!state.isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => updateState({ isOpen: true })}
            className="fixed bottom-2 left-2 z-50 flex size-7 items-center justify-center rounded-full bg-gray-800 font-mono text-xs text-white shadow-lg transition-transform hover:scale-110"
          >
            <BreakpointBadge />
          </motion.button>
        )}
      </AnimatePresence>
    </>,
    document.body,
  ) as ReactNode;
}
