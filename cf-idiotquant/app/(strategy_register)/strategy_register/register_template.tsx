import { Card, CardBody, CardFooter, CardHeader, Typography } from "@material-tailwind/react";

interface RegisterTemplateProps {
    cardBodyFix: boolean;
    id: string;
    totalStepCount: number;
    title: string;
    subTitle: any;
    content: any;
    footer: any;
}
export default function RegisterTemplate(props: RegisterTemplateProps) {
    // console.log(`props.id`, props.id);
    return <>
        <section className={`px-4`}>
            <Card shadow={false} className={`border-2 border-gray-100}`}>
                <CardHeader
                    shadow={false}
                    floated={false}
                    className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between rounded-none"
                >
                    <div>
                        <Typography
                            color="blue-gray"
                            variant="h1"
                            className="!text-2xl"
                        >
                            {props.title} {`-` == props.id ? `` : `(${Number(props.id) + 1} / ${props.totalStepCount})`}
                        </Typography>
                        {/* <Typography
                            color="blue-gray"
                            className="!text-lg font-normal text-gray-600"
                        >
                            The most sought-after collections across the entire ecosystem.
                        </Typography> */}

                        <div>
                            {props.subTitle}
                            {/* <span className='border border-1 border-red-500 rounded p-1'>나만의 투자 전략을 만들어보세요 🦄</span> */}
                        </div>
                    </div>
                    {/* <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outlined" className="border-gray-300">
                            Last 24h
                        </Button>
                        <Button size="sm" variant="outlined" className="border-gray-300">
                            Last week
                        </Button>
                        <Button size="sm" variant="outlined">
                            Last month
                        </Button>
                    </div> */}
                </CardHeader>
                <CardBody className={`grid grid-cols-1 ${props.cardBodyFix ? '' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4 px-4`}>
                    {/* {data.map((props, key) => (
                        <Web3Card key={key} parentRouter={parentRouter} {...props} />
                    ))} */}
                    <div>
                        {props.content}
                    </div>
                </CardBody>
                {!!props.footer ?
                    <CardFooter className="py-2">
                        {props.footer}
                    </CardFooter>
                    :
                    <></>
                }
            </Card>
        </section>
    </>
}