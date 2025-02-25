import { Chip, List, ListItem, ListItemSuffix, Typography } from "@material-tailwind/react"
import { CalculationResult } from "@/app/(calculator)/calculator/page"

export const CalculationList = (props: any) => {
    return <>
        <div className='font-mono w-screen flex justify-between items-center p-4 sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
            <div className="w-full h-full rounded-xl bg-white text-gray-700 border border-gray-300 shadow-md">
                <ListItem className='text-black pb-0 mb-1'>
                    <div className="w-full text-md header-contents text-center">
                        기대 수익 계산 <span className='bg-yellow-500'> 결과</span>
                    </div>
                    <ListItemSuffix>
                        <img className='h-4 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                    </ListItemSuffix>
                </ListItem>
                <List>
                    {props.resultList.length > 0 ?
                        props.resultList.map((element: CalculationResult, key: any) => {
                            return <ListItem className='p-1 border-2 border-gray-300 mb-1' key={key} onClick={(e) => props.handleOnClickResultList(e, key)}>
                                <div className='flex-col'>
                                    <div className="flex gap-1 pb-1">
                                        <Chip size='lg' color="amber" className="font-mono text-md" value={`최종수입금: ${element['totalValue'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`} />
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip color="amber" className="font-mono text-md" value={`투자기간: ${element['numberOfYears']}년`} />
                                        <Chip color="amber" className="font-mono text-md" value={`최종수익률: ${Number(element['finalRateOfReturn']).toFixed(2)}%`} />
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono text-md" variant="outlined" value={`누적투자금: ${element['totalInvestment'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`} />
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outlined" color="red" value={`이자율: ${element['interestRate']}%`} />
                                        <Chip className="font-mono" variant="outlined" color="blue" value={`물가상승률: ${element['inflationRate']}%`} />
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outlined" value={`초기투자금: ${element['investmentAmount'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원 (${props.getInterestRateBenchmark(element['compounding'])})`} />
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outlined" value={`추가납입금: ${element['contributions'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원 (${props.getContributeRateBenchmark(element['frequency'])})`} />
                                    </div>
                                </div>
                            </ListItem>
                        })
                        :
                        <ListItem>
                            <div>
                                <Typography variant="h6" color="blue-gray">
                                    <span className='font-mono border border-1 border-black rounded p-1'>계산 결과 등록 🦄</span> 버튼을 눌려주세요.
                                </Typography>
                            </div>
                        </ListItem>}
                </List>
            </div>
        </div>
    </>
}
