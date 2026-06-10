"use client";

import { PlaceValueChart } from "./PlaceValueChart";
import { Workspace } from "./Workspace";

export function ComparisonBoard() {
  return (
    <div className="comparison-board">
      <div className="comparison-panel">
        <PlaceValueChart
          group="a"
          droppableId="chart-a"
          title="Число A"
          chartClassName="comparison-chart-a"
          comparisonMode
        />
        <Workspace
          group="a"
          droppableId="workspace-a"
          className="comparison-workspace comparison-workspace-a"
        />
      </div>
      <div className="comparison-divider" aria-hidden />
      <div className="comparison-panel">
        <PlaceValueChart
          group="b"
          droppableId="chart-b"
          title="Число B"
          chartClassName="comparison-chart-b"
          comparisonMode
        />
        <Workspace
          group="b"
          droppableId="workspace-b"
          className="comparison-workspace comparison-workspace-b"
        />
      </div>
    </div>
  );
}
