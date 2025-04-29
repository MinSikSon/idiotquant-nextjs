import { Handle, Position } from "@xyflow/react";

// const DEFAULT_NODE_STYLE = "font-mono p-1 flex flex-col bg-white shadow-md border rounded-lg";
const DEFAULT_DATE_NODE_STYLE = `font-mono p-1 flex flex-col bg-white shadow-md border rounded-lg text-[0.7rem]`;
const DEFAULT_STOCK_NODE_STYLE = `font-mono p-1 flex flex-col bg-white shadow-md border rounded-lg text-[0.5rem]`;

export const CustomSourceNode = ({ data, isConnectable }: any) => {
    return (
        <>
            {/* <Handle
                type="target"
                position={Position.Left}
                onConnect={(params) => console.log('handle onConnect', params)}
                isConnectable={isConnectable}
            /> */}
            <div className={`${DEFAULT_DATE_NODE_STYLE} border-black`}>
                <div>
                    label: {data.label}
                </div>
                <div>
                    value: {data.value}
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                onConnect={(params) => console.log('handle onConnect', params)}
                isConnectable={isConnectable}
            />
        </>
    );
};

export function DateNode({ data, isConnectable }: { data: any, isConnectable: any }) {
    return <>
        <Handle
            type="target"
            position={Position.Left}
            isConnectable={isConnectable}
        />
        <div className={`${DEFAULT_DATE_NODE_STYLE} bg-gray-100 text-center`}>
            📅 {data.label}
        </div>
        <Handle
            type="source"
            position={Position.Right}
            isConnectable={isConnectable}
            id="a"
        />
        <Handle
            type="source"
            position={Position.Bottom}
            isConnectable={isConnectable}
            id="b"
        />
    </>
}

export function StockNode({ id, data, isConnectable }: any) {
    const isBuy = data.action === 'buy';
    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                onConnect={(params) => console.log(`[StockNode] target`, 'handle onConnect', params)}
                isConnectable={isConnectable}
            />
            <div className={`flex flex-col ${DEFAULT_STOCK_NODE_STYLE} ${isBuy ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="text-[0.4rem]">
                    {isBuy ? '매수' : '매도'}.{id}
                </div>
                <div>
                    {data.quantity}주.{data.price.toLocaleString()}원.{data.points}포인트
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                onConnect={(params) => console.log(`[StockNode] source`, 'handle onConnect', params)}
                isConnectable={isConnectable}
            />
        </>

    );
}