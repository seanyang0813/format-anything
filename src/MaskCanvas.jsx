// takes in a tensor and draw it out in black and white

import React, { useRef, useEffect, useState } from "react";

const MaskCanvas = ({ maskInfo }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const mask = maskInfo.mask;
        const scores = maskInfo.scores;
        // Create context and allocate buffer for pixel data
        const context = canvasRef.current.getContext("2d");
        const imageData = context.createImageData(mask.width, mask.height);
        const numMasks = scores.length; // 3

        let bestIndex = 0;
        for (let i = 1; i < numMasks; ++i) {
            if (scores[i] > scores[bestIndex]) {
                bestIndex = i;
            }
        }
        // draw the black and white mask based on the best index
        const pixelData = imageData.data;
        for (let i = 0; i < pixelData.length; ++i) {
            if (mask.data[numMasks * i + bestIndex] === 1) {
                const offset = 4 * i;
                pixelData[offset] = 0; // red
                pixelData[offset + 1] = 0; // green
                pixelData[offset + 2] = 0; // blue
                pixelData[offset + 3] = 255; // alpha
            }
        }

        // Draw image data to context
        context.putImageData(imageData, 0, 0);
    }, [maskInfo]);

    return (
        <canvas
            ref={canvasRef}
            width={maskInfo.mask.width}
            height={maskInfo.mask.height}
            style={{ border: "1px solid black" }}
        />
    );
};

export default MaskCanvas;
