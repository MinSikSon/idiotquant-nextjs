//////////////////////////////////////////////////////////////////////////////

import { Button } from "@material-tailwind/react";

// Loading
export default function Loading(props) {
    return (<>
        <Button variant="text" loading={true} className="font-mono">
            {props.loadingMsg}
        </Button>
    </>);
}