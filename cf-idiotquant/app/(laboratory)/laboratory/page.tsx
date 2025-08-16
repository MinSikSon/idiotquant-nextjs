"use client";

import SplitText from "@/src/TextAnimations/SplitText/SplitText";
export default function Laboratory() {
    return (
        <>
            <div>
                laboratory
            </div>

            <SplitText
                text="Hello, you!"
                delay={100}
                duration={0.6}
            />
        </>
    );
}