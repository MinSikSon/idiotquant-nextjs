"use client";

import Balatro from "@/src/Backgrounds/Balatro/Balatro";

export default function Laboratory() {
    return (
        <>
            <div>
                laboratory
            </div>
            <Balatro
                isRotate={false}
                mouseInteraction={true}
                pixelFilter={700}
            />
        </>
    );
}