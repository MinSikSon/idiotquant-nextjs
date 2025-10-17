import CircularText from "@/src/TextAnimations/CircularText/CircularText";

export default function Loading() {
    return (
        // <CircularText
        //     text="IDIOT*QUANT*LOADING*"
        //     // onHover="pause"
        //     onHover="goBonkers"
        //     spinDuration={20}
        //     className="!fixed inset-0 z-50 top-1/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center !text-black dark:!text-white"
        // />
        <div
            className="!fixed inset-0 z-50 top-1/2 left-1/2 w-full h-fit text-center bg-white -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center !text-black dark:!text-white
            shadow-md border"
        >loading</div>
    );
}