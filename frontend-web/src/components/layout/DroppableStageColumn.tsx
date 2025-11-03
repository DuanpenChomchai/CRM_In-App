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
      className={`min-h-[400px] transition-colors ${
        isOver ? "bg-accent/20 ring-2 ring-primary/50" : ""
      }`}
    >
      {children}
    </div>
  );
};
