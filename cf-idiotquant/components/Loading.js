//////////////////////////////////////////////////////////////////////////////

import { Button } from "@material-tailwind/react";

// Loading
export default function Loading(props) {
    const SimpleLoadingImage = () => {
        return (<>
            <div className="border border-gray-100 shadow rounded-lg px-4 py-0.5 w-full mx-auto">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-6 py-3">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                        </div>
                    </div>
                    <div className="flex-1 space-y-6 py-3">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                        </div>
                    </div>
                </div>
            </div>
        </>)
    }
    const LoadingImage = () => {
        return (<>
            <div className="border border-blue-100 shadow rounded-lg px-4 py-2 w-full mx-auto">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-6 py-1">
                        {/* <div className="h-2 bg-slate-200 rounded"></div> */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                            </div>
                            <div className="h-2 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </>)
    }

    return (<>
        <Button variant="text" loading={true}>
            {props.loadingMsg}
        </Button>
        {/* <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage />
        <SimpleLoadingImage /> */}
    </>);
}