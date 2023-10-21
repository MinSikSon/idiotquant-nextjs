import { ArrowTrendingUpIcon, ArrowUturnLeftIcon, BookOpenIcon, BuildingLibraryIcon, BuildingOffice2Icon, BuildingOfficeIcon, ChatBubbleOvalLeftEllipsisIcon, CurrencyDollarIcon, HeartIcon, HomeIcon } from "@heroicons/react/24/outline";
import { List, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";
import Link from "next/link";

export default function PostList(props) {
    return (
        <>
            <ListItem className='text-black'>
                <ListItemPrefix>
                    <Link href="/">
                        <HomeIcon strokeWidth={2} className="h-6 w-6" />
                    </Link>
                </ListItemPrefix>
                <div className="w-full font-mono text-xl header-contents text-center">
                    살펴 볼만한 어떤 <span className='bg-yellow-500'> 것</span>들
                </div>
                <ListItemSuffix>
                    <ArrowTrendingUpIcon strokeWidth={2} className="h-6 w-6" />
                </ListItemSuffix>
            </ListItem>

            <List>
                <Link href='./posts/famous_saying'>
                    <ListItem className='border-b-2'>
                        <ListItemPrefix>
                            <BookOpenIcon strokeWidth={2} className="h-6 w-6" />
                        </ListItemPrefix>
                        <div className='pt-1'>투자 격언</div>
                    </ListItem>
                </Link>
                <Link href='./posts/quant'>
                    <ListItem className='border-b-2'>
                        <ListItemPrefix>
                            <CurrencyDollarIcon strokeWidth={2} className="h-6 w-6" />
                        </ListItemPrefix>
                        <div className='pt-1'>퀀트 용어</div>
                    </ListItem>
                </Link>
                <Link href='./posts/etc'>
                    <ListItem className='border-b-2'>
                        <ListItemPrefix>
                            <ChatBubbleOvalLeftEllipsisIcon strokeWidth={2} className="h-6 w-6" />
                        </ListItemPrefix>
                        <div className='pt-1'>기타 등등 글</div>
                    </ListItem>
                </Link>
                <Link href='./posts/terms'>
                    <ListItem className='border-b-2'>
                        <ListItemPrefix>
                            <HeartIcon strokeWidth={2} className="h-6 w-6" />
                        </ListItemPrefix>
                        <div className='pt-1'>한 번에 보기</div>
                    </ListItem>
                </Link>
            </List>

        </>
    );
}