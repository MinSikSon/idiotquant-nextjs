import { ArrowUturnLeftIcon, } from "@heroicons/react/24/outline";
import { ListItem, ListItemPrefix, Navbar } from "@material-tailwind/react";
import React from "react";

export default function NewGroupPanel(props) {
    if ('NewGroupPanel' !== props.openedPanel) return <></>;

    const refFocus = React.useRef();

    React.useEffect(() => {
        refFocus.current.focus();
    }, []);

    return <>
        <Navbar>
            <ListItem className={`flex items-center w-full text-black p-0 m-0`}>
                <ListItemPrefix>
                    <div onClick={() => props.setOpenedPanel('StocksOfInterestPanel')}><ArrowUturnLeftIcon className="h-6 w-6" /></div>
                </ListItemPrefix>
                <div className="w-full text-center pr-10 text-lg">새 그룹</div>
            </ListItem>
        </Navbar>
        <div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    props.addNewStockGroup(e.target[0].value);
                    e.target[0].value = ''
                }}
                className={`gap-5`}
            >
                <input
                    ref={refFocus}
                    name="searchValue"
                    className="appearance-none border-b-2 border-blue-500 w-full text-black p-2 my-5 text-lg focus:outline-none"
                    type="text"
                    placeholder={`추가할 그룹명 입력`}
                    aria-label="Full name"
                />

                <button className="w-full text-lg bg-blue-500 text-white py-5" >저장</button>
            </form>
        </div>
    </>
}
