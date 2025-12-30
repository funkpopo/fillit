import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 0.15;

function getDistance(touches: React.TouchList) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

function getCenter(touches: React.TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentPicture, filledRegions, selectedColorIndex, fillRegion } = useGameStore();
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [originalData, setOriginalData] = useState<ImageData | null>(null);
  const [lineartData, setLineartData] = useState<ImageData | null>(null);
  const [highlightPhase, setHighlightPhase] = useState(0);
  const [baseImageData, setBaseImageData] = useState<ImageData | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  const [isTouchPanning, setIsTouchPanning] = useState(false);

  useEffect(() => {
    if (!currentPicture) return;

    setScale(1);
    setOffset({ x: 0, y: 0 });

    const loadImages = async () => {
      const original = new Image();
      original.crossOrigin = 'anonymous';
      original.src = currentPicture.coloredUrl;
      await new Promise(r => original.onload = r);

      const lineart = new Image();
      lineart.crossOrigin = 'anonymous';
      lineart.src = currentPicture.lineartUrl;
      await new Promise(r => lineart.onload = r);

      const mask = new Image();
      mask.crossOrigin = 'anonymous';
      mask.src = currentPicture.maskUrl;
      await new Promise(r => mask.onload = r);

      const width = original.width;
      const height = original.height;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

      tempCtx.drawImage(original, 0, 0, width, height);
      setOriginalData(tempCtx.getImageData(0, 0, width, height));

      tempCtx.clearRect(0, 0, width, height);
      tempCtx.drawImage(lineart, 0, 0, width, height);
      setLineartData(tempCtx.getImageData(0, 0, width, height));

      tempCtx.clearRect(0, 0, width, height);
      tempCtx.drawImage(mask, 0, 0, width, height);
      setMaskData(tempCtx.getImageData(0, 0, width, height));
    };

    loadImages();
  }, [currentPicture]);

  useEffect(() => {
    if (selectedColorIndex === null) return;
    const interval = setInterval(() => {
      setHighlightPhase(p => (p + 1) % 30);
    }, 40);
    return () => clearInterval(interval);
  }, [selectedColorIndex]);

  // 填充区域变化时重建基础图像
  useEffect(() => {
    if (!originalData || !lineartData || !maskData || !currentPicture) return;

    const regionColorMap = new Map<number, number>();
    for (const region of currentPicture.regions) {
      regionColorMap.set(region.id, region.colorIndex);
    }

    const width = maskData.width;
    const height = maskData.height;
    const imageData = new ImageData(
      new Uint8ClampedArray(originalData.data),
      width,
      height
    );
    const data = imageData.data;

    for (let i = 0; i < maskData.data.length; i += 4) {
      const regionId = maskData.data[i];

      if (regionId > 0 && filledRegions.has(regionId)) {
        continue;
      }

      if (regionId === 0) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        let hasUnfilledNeighbor = false;

        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborRegionId = maskData.data[(ny * width + nx) * 4];
            if (neighborRegionId > 0 && !filledRegions.has(neighborRegionId)) {
              hasUnfilledNeighbor = true;
              break;
            }
          }
        }

        if (!hasUnfilledNeighbor) continue;
      }

      data[i] = lineartData.data[i];
      data[i + 1] = lineartData.data[i + 1];
      data[i + 2] = lineartData.data[i + 2];
      data[i + 3] = lineartData.data[i + 3];
    }

    setBaseImageData(imageData);
  }, [originalData, lineartData, maskData, filledRegions, currentPicture]);

  // 渲染到画布
  useEffect(() => {
    if (!canvasRef.current || !baseImageData || !currentPicture) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = baseImageData.width;
    canvas.height = baseImageData.height;

    if (selectedColorIndex === null || !lineartData || !originalData || !maskData) {
      ctx.putImageData(baseImageData, 0, 0);
      return;
    }

    const regionColorMap = new Map<number, number>();
    for (const region of currentPicture.regions) {
      regionColorMap.set(region.id, region.colorIndex);
    }

    const highlightIntensity = Math.abs(Math.sin(highlightPhase * Math.PI / 15)) * 0.7 + 0.15;
    const imageData = new ImageData(
      new Uint8ClampedArray(baseImageData.data),
      baseImageData.width,
      baseImageData.height
    );
    const data = imageData.data;

    for (let i = 0; i < maskData.data.length; i += 4) {
      const regionId = maskData.data[i];
      if (regionId > 0 && !filledRegions.has(regionId)) {
        const colorIndex = regionColorMap.get(regionId);
        if (colorIndex === selectedColorIndex) {
          const blend = highlightIntensity;
          data[i] = Math.round(lineartData.data[i] * (1 - blend) + originalData.data[i] * blend);
          data[i + 1] = Math.round(lineartData.data[i + 1] * (1 - blend) + originalData.data[i + 1] * blend);
          data[i + 2] = Math.round(lineartData.data[i + 2] * (1 - blend) + originalData.data[i + 2] * blend);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [baseImageData, selectedColorIndex, highlightPhase, currentPicture, lineartData, originalData, maskData, filledRegions]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !containerRef.current) return null;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;

    const canvasX = (mouseX - offset.x) / scale;
    const canvasY = (mouseY - offset.y) / scale;

    return { x: Math.floor(canvasX), y: Math.floor(canvasY) };
  }, [scale, offset]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!maskData || selectedColorIndex === null || isPanning) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    const { x, y } = coords;
    if (x < 0 || y < 0 || x >= maskData.width || y >= maskData.height) return;

    const idx = (y * maskData.width + x) * 4;
    const regionId = maskData.data[idx];

    if (regionId > 0) {
      fillRegion(regionId);
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setLastTouchDistance(getDistance(e.touches));
      setLastTouchCenter(getCenter(e.touches));
    } else if (e.touches.length === 1) {
      setIsTouchPanning(true);
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const newCenter = getCenter(e.touches);

      if (lastTouchDistance > 0 && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const centerX = newCenter.x - containerRect.left;
        const centerY = newCenter.y - containerRect.top;

        const scaleRatio = newDistance / lastTouchDistance;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * scaleRatio));

        const actualRatio = newScale / scale;
        const newOffsetX = centerX - (centerX - offset.x) * actualRatio + (newCenter.x - lastTouchCenter.x);
        const newOffsetY = centerY - (centerY - offset.y) * actualRatio + (newCenter.y - lastTouchCenter.y);

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      }

      setLastTouchDistance(newDistance);
      setLastTouchCenter(newCenter);
    } else if (e.touches.length === 1 && isTouchPanning) {
      const dx = e.touches[0].clientX - lastPanPoint.x;
      const dy = e.touches[0].clientY - lastPanPoint.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [lastTouchDistance, lastTouchCenter, scale, offset, isTouchPanning, lastPanPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      if (!isTouchPanning || (Math.abs(e.changedTouches[0].clientX - lastPanPoint.x) < 10 && Math.abs(e.changedTouches[0].clientY - lastPanPoint.y) < 10)) {
        if (maskData && selectedColorIndex !== null) {
          const coords = getCanvasCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          if (coords) {
            const { x, y } = coords;
            if (x >= 0 && y >= 0 && x < maskData.width && y < maskData.height) {
              const idx = (y * maskData.width + x) * 4;
              const regionId = maskData.data[idx];
              if (regionId > 0) fillRegion(regionId);
            }
          }
        }
      }
      setIsTouchPanning(false);
      setLastTouchDistance(0);
    }
  }, [maskData, selectedColorIndex, fillRegion, getCanvasCoords, isTouchPanning, lastPanPoint]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

    if (newScale === scale) return;

    const scaleRatio = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;

    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;

    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPanPoint]);

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(MAX_SCALE, prev + SCALE_STEP));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(MIN_SCALE, prev - SCALE_STEP));
  };

  if (!currentPicture) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">选择一张图片开始</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-border bg-muted/30 touch-none"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          height: originalData ? `min(60vh, ${originalData.height}px)` : '60vh',
          cursor: isPanning ? 'grabbing' : (selectedColorIndex !== null ? 'crosshair' : 'grab'),
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            maxWidth: 'none',
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= MIN_SCALE}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground min-w-[4rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= MAX_SCALE}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
