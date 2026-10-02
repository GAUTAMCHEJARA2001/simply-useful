import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Preview'
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and position whenever image or open state changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      } else if (e.key.toLowerCase() === 'r') {
        handleRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoom, rotation]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.35, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 0.25, 5));
    } else {
      setZoom(prev => {
        const next = Math.max(prev - 0.25, 0.5);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Primary left button only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2.2);
    } else {
      handleReset();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 z-10 text-white backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-wide text-white/90">{title}</span>
          <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full text-white/80 font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-white hover:bg-white/20 h-8 px-2.5 gap-1.5 text-xs"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom In</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-white hover:bg-white/20 h-8 px-2.5 gap-1.5 text-xs"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom Out</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            className="text-white hover:bg-white/20 h-8 px-2.5 gap-1.5 text-xs"
            title="Rotate 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Rotate</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white hover:bg-white/20 h-8 px-2.5 gap-1.5 text-xs"
            title="Reset Zoom (0)"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <a
            href={imageUrl}
            download={`odometer_meter_${Date.now()}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-white hover:bg-white/20 h-8 px-2.5 gap-1.5 text-xs rounded-md transition-colors"
            title="Open / Download Full Image"
          >
            <Download className="w-4 h-4" />
          </a>

          <div className="h-5 w-px bg-white/20 mx-1 hidden sm:block" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-red-500/80 hover:text-white h-8 w-8 rounded-full"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Interactive Zoomable Canvas */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 touch-none ${
          isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center'
          }}
          className="max-h-[85vh] max-w-[90vw] flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="max-h-[82vh] max-w-[88vw] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
          />
        </div>

        {/* Helpful Tip Overlay when zoomed */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] text-white/70 border border-white/10 pointer-events-none">
          Scroll wheel to zoom &bull; Click &amp; drag to pan &bull; Double click to toggle zoom
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
