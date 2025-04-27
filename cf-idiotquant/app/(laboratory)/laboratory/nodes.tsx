const initialNodes = [
    // 날짜 노드
    {
        id: 'date-2025-04-25',
        type: 'dateNode',
        data: { label: '2025-04-25' },
        position: { x: 0, y: 0 }
    },
    // 종목 매매 노드
    {
        id: 'buy-삼성전자-2025-04-25',
        type: 'stockNode',
        data: {
            action: 'buy',
            stockName: '삼성전자',
            quantity: 10,
            price: 71500,
            profitRate: 5.4,    // 수익률
            points: 22          // 포인트 적립
        },
        position: { x: 200, y: 0 }
    },
    {
        id: 'sell-현대차-2025-04-25',
        type: 'stockNode',
        data: {
            action: 'sell',
            stockName: '현대차',
            quantity: 5,
            price: 180000,
            profitRate: -2.3,   // 손실
            points: 22
        },
        position: { x: 200, y: 100 }
    }
];

export default initialNodes;