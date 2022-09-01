import React, { useEffect, useRef } from "react";

export const InlineMetricsChart: React.FC<{
  seriesLength: number;
  series: (number | null)[];
  max: number;
  width?: number;
  height?: number;
}> = ({ seriesLength, series, max, width = 120, height = 50 }) => {
  const canvasRef = useRef<HTMLCanvasElement>();

  useEffect(() => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.clearRect(0, 0, width, height);
      const segmentWidth = Math.floor(width / seriesLength);
      for (let i = 0; i < seriesLength; i++) {
        const value = series[i];
        if (value !== null) {
          context.fillStyle = "#d1d5db";
          context.fillRect(i * segmentWidth, 0, segmentWidth, height);

          const percentage = value / max;
          const asdHeight = height * (1 - percentage);
          context.fillStyle = "#6b7280";
          context.fillRect(
            i * segmentWidth,
            asdHeight,
            segmentWidth,
            height - asdHeight
          );
        }
      }
    }
  }, [canvasRef.current, seriesLength, series]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};
