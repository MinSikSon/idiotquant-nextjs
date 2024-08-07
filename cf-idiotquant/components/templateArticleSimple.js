

export function TemplateArticleSimple(props) {
    const title = props.title;
    const subTitle = props.subTitle;
    const link = props.link;

    return (
        <div className="px-4 sm:p-6 md:py-10 md:px-8">
            <div className="grid grid-cols-1 lg:max-w-5xl lg:gap-x-20 lg:grid-cols-2">
                <div className="relative p-3 col-start-1 row-start-1 flex flex-col-reverse rounded-lg bg-gradient-to-t from-black/75 via-black/0 sm:bg-none sm:row-start-2 sm:p-0 lg:row-start-1">
                    <h1 className="mt-1 text-lg font-semibold text-white bg-black w-fit sm:text-slate-900 md:text-2xl dark:sm:text-white">
                        {title}
                    </h1>
                    <div className="text-sm leading-4 font-medium text-white bg-black w-fit sm:text-slate-500 dark:sm:text-slate-400">
                        <div>{subTitle}</div>
                    </div>
                </div>
                <div className="grid gap-4 col-start-1 col-end-3 row-start-1 sm:mb-6 sm:grid-cols-4 lg:gap-6 lg:col-start-2 lg:row-end-6 lg:row-span-6 lg:mb-0">
                    <img src={props.img} alt="" className="w-full h-32 object-cover rounded-lg sm:h-52 sm:col-span-2 lg:col-span-full" loading="lazy" />
                </div>
                <div className="mt-4 col-start-1 row-start-3 self-center sm:mt-0 sm:col-start-2 sm:row-start-2 sm:row-span-2 lg:mt-6 lg:col-start-1 lg:row-start-3 lg:row-end-4">
                </div>
                <div className="mt-4 text-sm leading-6 col-start-1 sm:col-span-2 lg:mt-6 lg:row-start-4 lg:col-span-1 bg-gray-100 rounded-lg">
                    <ul className='list-disc list-inside'>
                    </ul>
                </div>
            </div>
        </div>
    );
}