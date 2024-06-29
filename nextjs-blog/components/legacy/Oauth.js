import { Button, ListItem, Menu, MenuHandler, MenuItem, MenuList, Popover, PopoverContent, PopoverHandler } from "@material-tailwind/react";
import {
    ArrowRightOnRectangleIcon, ChevronDownIcon
} from "@heroicons/react/24/outline";

import Link from "next/link";
import React from "react";
import { MenuContext } from "@material-tailwind/react/components/Menu/MenuContext";

export default function Oauth(props) {
    const status = (!!props.loginStatus) ? `🖐 ${props.loginStatus}` : '로그인';

    const url = {
        pathname: '/login',
        query: {
            authorizeCode: props.authorizeCode,
        },
    }

    if (!!props.loginStatus) return (
        <div className='text-black'>
            <Menu open={props.openMenu} handler={props.setOpenMenu}>
                <MenuHandler>
                    <ListItem>
                        <div className="pt-1 text-xs">{status}</div>
                        <ChevronDownIcon
                            strokeWidth={2.5}
                            className={`h-3.5 w-3.5 transition-transform ${props.openMenu ? "rotate-180" : ""
                                }`}
                        />
                    </ListItem>
                </MenuHandler>
                <MenuList>
                    <MenuItem>
                        <Button>계정설정</Button>
                    </MenuItem>
                    <MenuItem>
                        <Button>로그아웃</Button>
                    </MenuItem>
                </MenuList>
            </Menu>
        </div>
    );

    return (
        <div className='text-black'>
            <Link className='flex' href={url} passHref as='/login'>
                <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                <div className="pt-1 text-xs">{status}</div>
            </Link>
        </div>
    );
}