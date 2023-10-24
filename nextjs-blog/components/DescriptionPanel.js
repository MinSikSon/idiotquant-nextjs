import { Option, Select } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import { strategyNCAV, strategyExample } from "../components/Strategy.js";

export default function DescriptionPanel(props) {
    if (props.openSearchResult) return <></>;

    function handleChange(selected) {
        switch (selected) {
            case 'ncav':
                props.setDictFilteredStockCompanyInfo(strategyNCAV(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' });
                break;
            case '2':
                props.setDictFilteredStockCompanyInfo(strategyExample(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: '소형주 + 저PER + 저PBR', description: 'TEST 중입니다' });
                break;
        }

        props.setSelectedStrategy(selected);
    }

    const { title, description } = props.strategyInfo;
    if (!!!props.loginStatus) return (
        <div className='sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
            <div className="w-full p-1 pt-4">
                <Select color='green' label="종목 선택 방법" onChange={(selected) => handleChange(selected)} value={props.selectedStrategy}>
                    <Option value='ncav'>NCAV</Option>
                    <Option value='2'>소형주 + 저 PBR + 저 PER</Option>
                </Select>
            </div>
            <CustomCard title={title} description={description} />
        </div>
    );

    const CustomListItem = (props) => {
        return (
            <ListItem className="p-0">
                <label htmlFor={`${props.id}`} className="flex w-full cursor-pointer items-center px-3 py-0">
                    <ListItemPrefix className="mr-3">
                        <Checkbox
                            id={`${props.id}`}
                            ripple={false}
                            className="hover:before:opacity-0"
                            containerProps={{
                                className: "p-0",
                            }}
                        />
                    </ListItemPrefix>
                    <div className='text-xs'>
                        {props.content}
                    </div>
                </label>
            </ListItem>
        )
    }

    return (
        <List className="flex-row">
            <CustomListItem id='per' content='저 PER' />
            <CustomListItem id='pbr' content='저 PBR' />
            <CustomListItem id='netIncome' content='당기순이익' />
        </List >
    );
};