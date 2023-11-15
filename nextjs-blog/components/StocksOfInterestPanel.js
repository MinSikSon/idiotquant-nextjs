import { Tabs, Tab, TabsBody, TabsHeader } from "@material-tailwind/react";

export default function StocksOfInterestPanel(props) {
    if (false === props.stocksOfInterestPanelOpened) return <></>;

    return (<>
        <Tabs value="ncav">
            <TabsHeader
                className="overflow-x-scroll rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}>
                {props.stocksOfInterest.map(({ label, value }) => (
                    <Tab className="shrink-0 w-fit text-sm" onClick={() => props.handleStocksOfInterestChange(value)} key={value} value={value}>
                        {label}
                    </Tab>
                ))}
            </TabsHeader>
            <TabsBody></TabsBody>
        </Tabs>
    </>);
}