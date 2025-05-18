
import Link from 'next/link';
import React from 'react';

export function TemplateArticle(props: any) {
    // console.log(`%cTemplateArticle`, 'color:blue;background:white;');
    const title = props.title;
    const subTitle = props.subTitle;
    const detail = props.detail;
    const link = props.link;

    const SubList = (props: any) => {
        const item = props.item;
        if ('object' == typeof item) {
            return (
                <ul className='list-disc list-inside pl-4'>
                    {item.map((subItem: any, index: any) => {
                        return (<li key={index.toString()}>{subItem}</li>);
                    })}
                </ul>
            );
        }

        return (<li >{item}</li>);
    }

    const [mouse, setMouse] = React.useState([0, 0]);
    const mouseX = React.useRef(0);
    const mouseY = React.useRef(0);
    const CustomImage = (props: any) => {
        return (
            <>
                <div className="relative col-start-1 row-start-1 flex flex-col-reverse rounded-lg sm:bg-none sm:row-start-2 sm:p-0 lg:row-start-1">
                    <h1 className="mt-1 text-lg font-semibold text-white bg-black w-fit sm:text-slate-900 md:text-2xl dark:sm:text-white">{title}</h1>
                    <div className="text-sm leading-4 font-medium text-white bg-black w-fit sm:text-slate-500 dark:sm:text-slate-400">
                        {!!link ?
                            <Link href={link}>{subTitle}</Link> :
                            <div> {subTitle}</div>
                        }
                    </div>
                </div>

                <div
                    onMouseMove={(e: any) => {
                        // console.log(`onMouseMove e`, e);
                        const x = e.pageX - e.target.x;
                        const y = e.pageY - e.target.y;

                        // const rotateY = -1 / 5 * x + 20;
                        const rotateY = -1 / 10 * x + 20;
                        // const rotateX = 4 / 30 * y - 20;
                        const rotateX = 1 / 20 * y - 5;
                        e.target.style.transform = `perspective(350px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    }}
                    onMouseOut={(e: any) => {
                        e.target.style.transform = `perspective(350px) rotateX(0deg) rotateY(0deg)`;
                    }}
                    onTouchMove={(e: any) => {
                        // console.log(`onTouchMove e`, e);
                        const x = e.targetTouches[0].pageX - e.target.x;
                        const y = e.targetTouches[0].pageY - e.target.y;

                        // const rotateY = -1 / 5 * x + 20;
                        const rotateY = -1 / 10 * x + 20;
                        // const rotateX = 4 / 30 * y - 20;
                        const rotateX = 1 / 20 * y - 5;
                        e.target.style.transform = `perspective(350px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    }}
                    onTouchEnd={(e: any) => {
                        e.target.style.transform = `perspective(350px) rotateX(0deg) rotateY(0deg)`;
                    }}
                >
                    <div className="px-6 grid gap-4 col-start-1 col-end-3 row-start-1 sm:mb-6 sm:grid-cols-4 lg:gap-6 lg:col-start-2 lg:row-end-6 lg:row-span-6 lg:mb-0">
                        <img
                            src={props.img}
                            alt=""
                            className="w-full h-fit object-cover rounded-md sm:w-fit sm:col-span-2 lg:col-span-full border-8 border-s-gray-500 hover:border-s-red-50 border-e-gray-400 hover:border-e-orange-100 border-t-gray-300 hover:border-t-yellow-100 border-b-gray-200 hover:border-b-green-100"
                            loading="lazy"
                        />
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="py-6 px-4 sm:p-6 md:py-10 md:px-8">
            <CustomImage img={props.img} />
            <div className="mt-4 text-sm leading-6 col-start-1 sm:col-span-2 lg:mt-6 lg:row-start-4 lg:col-span-1 bg-gray-100 rounded-lg">
                <ul className='list-disc list-inside'>
                    {detail.map((item: any, index: any) => <SubList key={index.toString()} item={item} />)}
                </ul>
            </div>
        </div>
    );
}

