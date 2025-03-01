"use client"

import ASCIIText from '@/components/design/ASCIIText';
import FuzzyText from '@/components/design/FuzzyText';
import Squares from '@/components/design/Squares';


export default function Laboratory() {
    return (
        <div className="w-full bg-none">
            {/* <ASCIIText
                text='hello_world'
                enableWaves={true}
                asciiFontSize={8}
            /> */}
            {/* <FuzzyText
                baseIntensity={0.2}
                hoverIntensity={0.5}
                enableHover={true}
                color="#000"
            >
                404
            </FuzzyText> */}

            {/* <Squares
                speed={0.5} // ideal speed 0.5 - 1
                squareSize={30}
                direction='diagonal' // up, down, left, right, diagonal
                borderColor='#ffffff'
                hoverFillColor='#53C66A'
            /> */}
        </div>
    );
}