import React, { useState, useCallback, useRef } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropModalProps {
    imageSrc: string;
    onConfirm: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ imageSrc, onConfirm, onCancel }) => {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const containerRef = useRef<HTMLDivElement>(null);

    // Add touch support
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
        });
    };

    const handleConfirm = async () => {
        if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Output size
        const size = 300; // Higher resolution
        canvas.width = size;
        canvas.height = size;

        const img = imageRef.current;
        const container = containerRef.current;

        // Calculate the ratio between the visible container and the output canvas
        const pixelRatio = size / container.clientWidth;

        // 1. Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // 2. Calculate dimensions
        // The image is rendered with height: 100% in the container (aspect-square)
        // So its rendered height is container.clientHeight
        // Its rendered width is (naturalWidth / naturalHeight) * container.clientHeight

        const renderedHeight = container.clientHeight;
        const renderedWidth = (img.naturalWidth / img.naturalHeight) * renderedHeight;

        // 3. Apply transformations
        // We need to translate to center, apply user pan/zoom, then draw

        ctx.save();

        // Move to center of canvas
        ctx.translate(size / 2, size / 2);

        // Apply user's pan (scaled to canvas space)
        ctx.translate(position.x * pixelRatio, position.y * pixelRatio);

        // Apply user's zoom
        ctx.scale(zoom, zoom);

        // Draw image centered
        // We draw it at its "rendered size" scaled up to canvas space
        const drawWidth = renderedWidth * pixelRatio;
        const drawHeight = renderedHeight * pixelRatio;

        ctx.drawImage(
            img,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        ctx.restore();

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (blob) {
                onConfirm(blob);
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-none p-6 max-w-md w-full shadow-hard">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Crop Avatar</h3>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-border rounded-none transition-colors border border-transparent hover:border-border"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Crop Area */}
                    <div
                        ref={containerRef}
                        className="relative w-full aspect-square bg-black/50 rounded-none overflow-hidden border-2 border-primary/50 cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="Crop preview"
                                className="max-w-none"
                                style={{
                                    height: '100%', // Fit height initially
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                }}
                                draggable={false}
                            />
                        </div>

                        {/* Grid Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                                <div className="border-r border-b border-white/30"></div>
                                <div className="border-r border-b border-white/30"></div>
                                <div className="border-b border-white/30"></div>
                                <div className="border-r border-b border-white/30"></div>
                                <div className="border-r border-b border-white/30"></div>
                                <div className="border-b border-white/30"></div>
                                <div className="border-r border-white/30"></div>
                                <div className="border-r border-white/30"></div>
                                <div></div>
                            </div>
                        </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-3">
                        <ZoomOut size={18} className="text-muted" />
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 accent-primary rounded-none"
                        />
                        <ZoomIn size={18} className="text-muted" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-background border border-border rounded-none font-bold hover:bg-border transition-colors uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 px-4 py-2 bg-primary text-primary-fg rounded-none font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-wider border border-transparent"
                        >
                            <Check size={18} />
                            Confirm
                        </button>
                    </div>
                </div>

                {/* Hidden canvas for cropping */}
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
};
