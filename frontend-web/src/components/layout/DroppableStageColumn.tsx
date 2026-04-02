import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableStageColumnProps {
  id: string;
  children: ReactNode;
}

export const DroppableStageColumn = ({ id, children }: DroppableStageColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-full overflow-y-auto pr-1 pb-20 transition-colors flex flex-col gap-3 rounded-xl p-0.5 scrollbar-thin scrollbar-thumb-stone-200 hover:scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-800 ${
        isOver ? "bg-accent/20 ring-2 ring-primary/50" : ""
      }`}
    >
      {children}
    </div>
  );
};
