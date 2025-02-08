import { Card, CardBody, CardFooter, CardHeader, Typography } from "@material-tailwind/react";

interface RegisterTemplateProps {
    cardBodyFix: boolean;
    title: string;
    subTitle: any;
    content: any;
    footer: any;
}
export default function RegisterTemplate(props: RegisterTemplateProps) {
    return <>
        <section className={`px-2`}>
            <Card shadow={false} className={`border rounded border-gray-100}`}>
                <CardHeader
                    shadow={false}
                    floated={false}
                    className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between rounded"
                >
                    <div>
                        <Typography
                            color="blue-gray"
                            variant="h1"
                            className="!text-2xl"
                        >
                            {props.title}
                        </Typography>
                        <div>
                            {props.subTitle}
                        </div>
                    </div>
                </CardHeader>
                <CardBody className={`grid grid-cols-1 ${props.cardBodyFix ? '' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4 px-4`}>
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