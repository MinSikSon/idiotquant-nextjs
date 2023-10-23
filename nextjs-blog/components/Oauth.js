import {
    ArrowRightOnRectangleIcon, ChevronDownIcon
} from "@heroicons/react/24/outline";
import { Button, Menu, MenuHandler, MenuList } from "@material-tailwind/react";
import Link from "next/link";
import React from "react";

export default function Oauth(props) {
    const status = (!!props.loginStatus) ? `🖐 ${props.loginStatus}` : '로그인';

    const url = {
        pathname: '/login',
        query: {
            authorizeCode: props.authorizeCode,
        },
    }

    const [openMenu, setOpenMenu] = React.useState(false);

    return (
        <div className='text-black'>
            {!!props.loginStatus ?
                <Menu open={openMenu} handler={setOpenMenu} allowHover>
                    <MenuHandler className='flex'>
                        <div className="pt-1 text-xs">{status}</div>
                        <ChevronDownIcon
                            strokeWidth={2.5}
                            className={`h-3.5 w-3.5 transition-transform ${openMenu ? "rotate-180" : ""
                                }`}
                        />
                    </MenuHandler>
                    <MenuList className="hidden w-[36rem] grid-cols-7 gap-3 overflow-visible lg:grid">
                        <Button>계정설정</Button>
                        <Button>로그아웃</Button>
                    </MenuList>
                </Menu>
                :
                <Link className='flex' href={url} passHref as='/login'>
                    <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                    <div className="pt-1 text-xs">{status}</div>
                </Link>
            }

        </div>
    );
}