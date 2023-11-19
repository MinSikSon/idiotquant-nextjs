import { ArrowLeftIcon, ArrowUturnLeftIcon, BackwardIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";
import React from "react";

export default function NewGroupPanel(props) {
    const refFocus = React.useRef();

    React.useEffect(() => {
        refFocus.current.focus();
    }, []);

    return <>
        <ListItem className={`flex items-center w-full`}>
            <ListItemPrefix>
                <div onClick={() => props.editGroupDone()}><ArrowUturnLeftIcon className="h-6 w-6" /></div>
            </ListItemPrefix>
            <div className="w-full text-center pr-10 text-lg">새 그룹</div>
        </ListItem>

        <div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    // console.log(e.target[0].value);
                    props.addNewStockGroup(e.target[0].value);
                    e.target[0].value = ''
                    props.editGroupDone();
                }}
                className={`gap-5`}
            >
                <input
                    ref={refFocus}
                    name="searchValue"
                    className="appearance-none border-b border-b-2 border-blue-500 w-full text-black p-2 my-5 text-lg focus:outline-none"
                    type="text"
                    placeholder={`추가할 그룹명 입력`}
                    aria-label="Full name"
                />

                <button className="w-full text-lg bg-blue-500 text-white py-5" >저장</button>
            </form>
        </div>
    </>
}