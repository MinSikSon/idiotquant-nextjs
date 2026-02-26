import { StockScoreGauge } from "./StockScoreGauge";
import { StockVisualArea } from "./StockVisualArea";

// 1. 종목 카드 컴포넌트
export const StockCard = ({ stock }: any) => {
    // console.log(`[StockCard] stock:`, stock);

    return (
        <div className={`relative w-[18rem] h-[27rem] rounded-xl bg-gradient-to-br ${stock?.grade?.cardGradeColor} shadow-2xl transform transition hover:scale-105 cursor-pointer`}>
            <div className="dark:!border dark:!border-zinc-500 w-full h-full rounded-lg p-4 flex flex-col justify-between">
                {/* 상단: 종목명 및 등급 */}
                <div className="flex justify-between items-start">
                    <h3 className="text-white font-bold text-2xl">{stock.name}</h3>
                    <span className={`${stock?.grade?.color} font-black text-2xl`}>{stock?.grade?.grade}</span>
                </div>

                {/* 중앙: 캐릭터 이미지 대신 차트/로고 */}
                {/* <div className="h-32 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700"> */}
                {/* <span className="text-gray-500 text-sm">차트/로고 영역</span> */}
                <StockVisualArea
                    // stockName="tsla"
                    stockName={stock.name}
                // domain="samsung.com"
                />

                {/* 하단: 퀀트 능력치 (스탯) */}
                <div className="space-y-2">
                    <div className="flex justify-between text-lg">
                        <span className="font-bold text-zinc-500 dark:text-zinc-400">적정가</span>
                        <span className="font-mono text-green-400">{stock.fairValue.toLocaleString()}</span>
                    </div>
                    <StockScoreGauge stock={stock} />

                    <div className="grid grid-cols-2 gap-2 text-lg">
                        <div className="bg-gray-800 p-1 rounded border border-gray-700 text-blue-300 text-center">
                            PER: {stock.per}
                        </div>
                        <div className="bg-gray-800 p-1 rounded border border-gray-700 text-pink-300 text-center">
                            PBR: {stock.pbr}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};