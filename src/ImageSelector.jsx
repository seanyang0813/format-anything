import React, { useRef, useEffect, useState, useCallback } from "react";

// create buttons for positive vs negative points

// Clamp a value inside a range [min, max]
function clamp(x, min = 0, max = 1) {
    return Math.max(Math.min(x, max), min);
}

const ImageWithOverlay = ({ src, alt, points, setPoints }) => {
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    // 1 is positive 1 is negative
    const [pointType, setPointType] = useState(1);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            console.log("redrew canvas");
            redrawCanvas(canvas, points);
        }
        console.log(points);
    }, [src, points]); // Redraw when the src or points change

    const handleCanvasClick = (e) => {
        const rect = imageRef.current.getBoundingClientRect();
        console.log(rect);
        const x = clamp((e.clientX - rect.left) / rect.width);
        const y = clamp((e.clientY - rect.top) / rect.height);

        console.log("clicked at index ", e.clientX, e.clientY);
        setPoints([...points, { point: [x, y], label: pointType }]);
    };

    const resetCanvas = () => {
        setPoints([]);
    };

    const undoLastPoint = () => {
        setPoints(points.slice(0, points.length - 1));
    };

    // Function to redraw the canvas
    const redrawCanvas = (canvas, points) => {
        console.log("clicked drawing");
        const ctx = canvas.getContext("2d");
        const rect = canvasRef.current.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

        // Draw all points green if they are positive, red if they are negative
        points.forEach((point) => {
            ctx.fillStyle =
                point.label === 1
                    ? "rgba(0, 255, 0, 0.5)"
                    : "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.arc(
                point.point[0] * rect.width,
                point.point[1] * rect.height,
                5,
                0,
                2 * Math.PI
            ); // Draw circle for each point
            ctx.fill();
        });
        console.log("redrawn canvas");
    };

    return (
        <div className="relative">
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                className="w-full"
                onClick={handleCanvasClick}
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                onClick={handleCanvasClick}
            />
            <p>
                Currently drawing {pointType === 1 ? "positive" : "negative"}{" "}
                type points
            </p>
            <div className="flex items-center justify-center">
                <button
                    className="bottom-0 left-0 bg-blue-500 text-white p-2 m-5 rounded-full"
                    onClick={() => setPointType(1)}
                >
                    Positive
                </button>
                <button
                    className="bottom-0 left-0 bg-blue-500 text-white p-2 m-5 rounded-full"
                    onClick={() => setPointType(-1)}
                >
                    Negative
                </button>
                <button
                    className="bottom-0 left-0 bg-blue-500 text-white p-2 m-5 rounded-full"
                    onClick={undoLastPoint}
                >
                    Undo
                </button>
                <button
                    className="bottom-0 left-0 bg-blue-500 text-white p-2 m-5 rounded-full"
                    onClick={resetCanvas}
                >
                    Reset
                </button>
            </div>
        </div>
    );
};
export default ImageWithOverlay;
