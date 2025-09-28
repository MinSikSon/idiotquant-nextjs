import { Chip, List, Typography } from "@material-tailwind/react"
import { CalculationResult } from "@/app/(calculator)/calculator/page"

export const CalculationList = (props: any) => {
    return <>
        <div className="font-mono dark:bg-black dark:text-white flex justify-between p-1 m-1">
            <div className="w-full h-full rounded-xl text-gray-700 border border-gray-300 shadow-md">
                <div className='flex items-center p-1 m-1'>
                    <div className="font-mono dark:text-white w-full text-md header-contents text-center">
                        기대 수익 계산 <span className="bg-yellow-500 dark:bg-gray-500"> 결과</span>
                    </div>
                    <img className='h-4 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                </div>
                <div>
                    {props.resultList.length > 0 ?
                        props.resultList.map((element: CalculationResult, key: any) => {
                            return <div className='p-1 border-2 border-gray-300 mb-1' key={key} onClick={(e) => props.handleOnClickResultList(e, key)}>
                                <div className='flex-col'>
                                    {/* <div className="flex gap-1 pb-1">
                                        <Chip size='lg' color="info" className="font-mono text-md">
                                            <Chip.Label>{`수입금: ${element['totalValue'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`}</Chip.Label>
                                        </Chip>
                                    </div> */}
                                    <div className="flex gap-1 pb-1">
                                        <Chip color="info" className="font-mono text-md" >
                                            <Chip.Label>{`투자기간: ${element['numberOfYears']}년`} </Chip.Label>
                                        </Chip>
                                        <Chip color="info" className="font-mono text-md">
                                            <Chip.Label>{`최종수익률: ${Number(element['finalRateOfReturn']).toFixed(2)}%`}</Chip.Label>
                                        </Chip>
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono text-md" variant="outline">
                                            <Chip.Label>{`누적투자금: ${element['totalInvestment'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`}</Chip.Label>
                                        </Chip>
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outline" color="info" >
                                            <Chip.Label>{`이자율: ${element['interestRate']}%`}</Chip.Label>
                                        </Chip>
                                        <Chip className="font-mono" variant="outline" color="info"  >
                                            <Chip.Label>{`물가상승률: ${element['inflationRate']}%`}</Chip.Label>
                                        </Chip>
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outline"  >
                                            <Chip.Label>{`초기투자금: ${element['investmentAmount'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원 (${props.getInterestRateBenchmark(element['compounding'])})`}</Chip.Label>
                                        </Chip>
                                    </div>
                                    <div className="flex gap-1 pb-1">
                                        <Chip className="font-mono" variant="outline" >
                                            <Chip.Label>{`추가납입금: ${element['contributions'].toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원 (${props.getContributeRateBenchmark(element['frequency'])})`}</Chip.Label>
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                        })
                        :
                        <div>
                            <Typography variant="h6" color="info">
                                <span className='font-mono border border-1 border-black rounded p-1'>계산 결과 등록 🦄</span> 버튼을 눌려주세요.
                            </Typography>
                        </div>
                    }
                </div>
            </div>
        </div>
    </>
}
