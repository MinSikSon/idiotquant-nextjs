import { Card } from "@material-tailwind/react";

interface RegisterTemplateProps {
    cardBodyFix: boolean;
    title: any;
    subTitle: any;
    content: any;
    footer: any;
}
export default function RegisterTemplate(props: RegisterTemplateProps) {
    return <>
        <section className={`px-2`}>
            <Card className={`border rounded-xl border-gray-100 shadow-none`}>
                <Card.Header className="flex overflow-visible gap-y-2 flex-wrap items-start justify-between rounded shadow-none">
                    <div className="font-mono text-black">
                        <div>
                            {props.title}
                        </div>
                        <div>
                            {props.subTitle}
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className={`py-4 px-4 grid grid-cols-1 ${props.cardBodyFix ? '' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
                    <div className="w-full">
                        {props.content}
                    </div>
                </Card.Body>
                {!!props.footer ?
                    <Card.Footer className="py-2">
                        {props.footer}
                    </Card.Footer>
                    :
                    <></>
                }
            </Card>
        </section>
    </>
}