// "use client";

// import React, { useCallback, useState } from 'react';

// import { ReactFlow, MiniMap, Controls, Background, Panel, Handle } from '@xyflow/react';
// import { addEdge, applyEdgeChanges, applyNodeChanges, useEdgesState, useNodesState } from '@xyflow/react';
// import { Position } from '@xyflow/react';

// import '@xyflow/react/dist/style.css';
// import { CustomSourceNode, DateNode, StockNode } from './custom_node';
// import { useAppDispatch, useAppSelector } from '@/lib/hooks';
// import { CapitalTokenType, reqGetCapitalToken, reqGetUsCapitalToken, selectCapitalToken, selectUsCapitalToken } from '@/lib/features/algorithmTrade/algorithmTradeSlice';
// import { getKoreaInvestmentToken, KoreaInvestmentToken } from '@/lib/features/koreaInvestment/koreaInvestmentSlice';

// const initialNodes = [
//     {
//         id: 'date-2025-04-25',
//         type: 'dateNode',
//         data: { label: '2025-04-25' },
//         position: { x: 0, y: 0 }
//     },
//     {
//         id: 'buy-삼성전자-2025-04-25',
//         type: 'stockNode',
//         data: {
//             action: 'buy',
//             stockName: '삼성전자',
//             quantity: 10,
//             price: 71500,
//             profitRate: 5.4,    // 수익률
//             points: 22          // 포인트 적립
//         },
//         position: { x: 10, y: 50 }
//     },
//     {
//         id: 'sell-현대차-2025-04-25',
//         type: 'stockNode',
//         data: {
//             action: 'sell',
//             stockName: '현대차',
//             quantity: 5,
//             price: 180000,
//             profitRate: -2.3,   // 손실
//             points: 22
//         },
//         position: { x: 10, y: 150 }
//     },
//     {
//         id: 'date-2025-04-26',
//         type: 'dateNode',
//         data: { label: '2025-04-26' },
//         position: { x: 100, y: 0 }
//     },
//     {
//         id: 'buy-삼성전자-2025-04-26',
//         type: 'stockNode',
//         data: {
//             action: 'buy',
//             stockName: '삼성전자',
//             quantity: 10,
//             price: 71500,
//             profitRate: 5.4,    // 수익률
//             points: 22          // 포인트 적립
//         },
//         position: { x: 110, y: 50 }
//     },
//     {
//         id: 'sell-현대차-2025-04-26',
//         type: 'stockNode',
//         data: {
//             action: 'sell',
//             stockName: '현대차',
//             quantity: 5,
//             price: 180000,
//             profitRate: -2.3,   // 손실
//             points: 22
//         },
//         position: { x: 110, y: 150 }
//     },
//     {
//         id: '1',
//         // type: 'input',
//         type: 'customSourceNode',
//         data: { label: 'Input Node', value: 'input' },
//         position: { x: 250, y: 25 },
//     },

//     {
//         id: '2',
//         // you can also pass a React component as a label
//         data: { label: <div>Default Node</div> },
//         position: { x: 100, y: 125 },
//     },
//     {
//         id: '3',
//         type: 'output',
//         data: { label: 'Output Node' },
//         position: { x: 250, y: 250 },
//     },
// ];

// const initialEdges = [
//     { id: 'e1-2', source: '1', target: '2' },
//     { id: 'e2-3', source: '2', target: '3', animated: true },
//     { id: 'e-date-2025-04-25--buy-삼성전자-2025-04-25', source: 'date-2025-04-25', sourceHandle: 'b', target: 'buy-삼성전자-2025-04-25', animated: true },
//     { id: 'e-buy-삼성전자-2025-04-25--sell-현대차-2025-04-25', source: 'buy-삼성전자-2025-04-25', target: 'sell-현대차-2025-04-25', animated: true },
//     { id: 'e-date-2025-04-25--date-2025-04-26', source: 'date-2025-04-25', sourceHandle: 'a', target: 'date-2025-04-26', animated: true },
//     { id: 'e-date-2025-04-26--buy-삼성전자-2025-04-26', source: 'date-2025-04-26', sourceHandle: 'b', target: 'buy-삼성전자-2025-04-26', animated: true },
//     { id: 'e-buy-삼성전자-2025-04-26--sell-현대차-2025-04-26', source: 'buy-삼성전자-2025-04-26', target: 'sell-현대차-2025-04-26', animated: true },
// ];
// // const defaultEdgeOptions = { animated: true, style: { stroke: '#f6ab00', strokeWidth: 2 }, type: 'step' };
// const defaultEdgeOptions = { animated: true, style: { stroke: '#f6ab00', strokeWidth: 2 } };

// const DEBUG = false;
// function Flow() {
//     const dispatch = useAppDispatch();

//     const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

//     const kr_capital_token: CapitalTokenType = useAppSelector(selectCapitalToken);
//     const us_capital_token: CapitalTokenType = useAppSelector(selectUsCapitalToken);

//     const [time, setTime] = React.useState<any>('');
//     function handleOnClick() {
//         setTime(new Date());
//         if (DEBUG) console.log(`[handleOnClick] kiToken`, kiToken);
//         dispatch(reqGetCapitalToken({ koreaInvestmentToken: kiToken }));
//         dispatch(reqGetUsCapitalToken({ koreaInvestmentToken: kiToken }));
//     }

//     React.useEffect(() => {
//         handleOnClick();
//     }, []);

//     const ADDITIONAL_VISIBLE_COUNT: number = 100;
//     const [visibleCount, setVisibleCount] = React.useState<number>(ADDITIONAL_VISIBLE_COUNT);

//     function reDraw() {
//         if (DEBUG) console.log(`kr_capital_token`, kr_capital_token);
//         const capitalToken = "KR" == market ? kr_capital_token : us_capital_token;

//         let purchase_log: any = capitalToken.value.purchase_log ?? [];
//         if (DEBUG) console.log(`!!purchase_log`, !!purchase_log, `purchase_log`, purchase_log);
//         if (!!!purchase_log) {
//             return;
//         }

//         let purchase_log_reverse = purchase_log.length > 0 ? [...purchase_log].reverse() : [];
//         if (DEBUG) console.log(`purchase_log`, purchase_log);
//         if (DEBUG) console.log(`purchase_log_reverse`, purchase_log_reverse);
//         let purchase_nodes: any[] = [];
//         let purchase_edges: any[] = [];

//         let date_index = 0;
//         let prev_time_stamp = "";
//         let prev_date = "";
//         let edge_index = 0;

//         let additional_y = 0;
//         purchase_log_reverse.slice(0, 100 + visibleCount).map((item, index) => {
//             const time_stamp = item.time_stamp;
//             const date = time_stamp.split('T')[0];
//             const stock_list = item.stock_list;

//             const foundIndex = purchase_nodes.findIndex((node: any) => node.id === date);

//             if (index > 0) {
//                 if (date != prev_date) {
//                     date_index++;
//                 }
//             }

//             const new_date_node = {
//                 id: date,
//                 type: 'dateNode',
//                 data: { label: date },
//                 position: { x: 180 * date_index, y: 0 }
//             };
//             if (-1 == foundIndex) {
//                 purchase_nodes.push(new_date_node);
//             }

//             const prev_item: any = (date == prev_date) ? purchase_log_reverse[index - 1] : [];
//             if (date == prev_date) {
//                 additional_y += prev_item.stock_list.length
//             }
//             else {
//                 additional_y = 0;
//             }
//             if (DEBUG) console.log(`additional_y`, additional_y);
//             for (let i = 0; i < stock_list.length; i++) {
//                 const new_stock_node = {
//                     id: time_stamp + "-" + stock_list[i].stock_name,
//                     type: 'stockNode',
//                     data: {
//                         action: stock_list[i].buyOrSell,
//                         stockName: stock_list[i].stock_name,
//                         quantity: stock_list[i].ORD_QTY,
//                         price: stock_list[i].stck_prpr,
//                         // profitRate: 5.4, // 수익률
//                         points: stock_list[i].remaining_token, // 포인트 적립
//                     },
//                     position: { x: 180 * date_index, y: (additional_y + i + 1) * 30 }
//                 };

//                 if (0 == i) {
//                     if (date == prev_date) {
//                         const prev_item_stock_list = prev_item.stock_list;
//                         if (DEBUG) console.log(`date`, date, `, index`, index, `, prev_item_stock_list.length`, prev_item_stock_list.length, `, purchase_log_reverse`, purchase_log_reverse);
//                         const prev_node_id = prev_time_stamp + "-" + prev_item_stock_list[prev_item_stock_list.length - 1].stock_name;
//                         const new_edge = { id: `e-${edge_index++}-${prev_node_id}--${new_stock_node.id}`, source: prev_node_id, target: new_stock_node.id };
//                         purchase_edges.push(new_edge);
//                     }
//                     else {
//                         const new_edge = { id: `e-${edge_index++}-${new_date_node.id}--${new_stock_node.id}`, source: new_date_node.id, sourceHandle: 'b', target: new_stock_node.id };
//                         purchase_edges.push(new_edge);
//                     }
//                 }
//                 else {
//                     const prev_node_id = prev_time_stamp + "-" + stock_list[i - 1].stock_name;
//                     const new_edge = { id: `e-${edge_index++}-${prev_node_id}--${new_stock_node.id}`, source: prev_node_id, target: new_stock_node.id };
//                     purchase_edges.push(new_edge);
//                 }

//                 purchase_nodes.push(new_stock_node);
//             }

//             prev_time_stamp = time_stamp;
//             prev_date = date;
//         });

//         if (DEBUG) console.log(`purchase_nodes`, purchase_nodes);
//         if (DEBUG) console.log(`purchase_edges`, purchase_edges);
//         setNodes(purchase_nodes);
//         setEdges(purchase_edges);
//     }
//     React.useEffect(() => {
//         reDraw();
//     }, [kr_capital_token]);

//     const [market, setMarket] = React.useState<"KR" | "US">("KR");

//     const nodeTypes = {
//         dateNode: DateNode,
//         stockNode: StockNode,
//         customSourceNode: CustomSourceNode,
//     };

//     // const [nodes, setNodes] = useState(initialNodes);
//     // const [edges, setEdges] = useState(initialEdges);
//     const [nodes, setNodes] = useState<any>([]);
//     const [edges, setEdges] = useState<any>([]);
//     const onNodesChange = useCallback(
//         (changes: any) => {
//             if (DEBUG) console.log(`[onNodesChange]`, `changes`, changes);
//             setNodes((nds: any) => applyNodeChanges(changes, nds))
//         },
//         [setNodes],
//     );
//     const onEdgesChange = useCallback(
//         (changes: any) => {
//             if (DEBUG) console.log(`[onEdgesChange]`, `changes`, changes);
//             setEdges((eds: any) => applyEdgeChanges(changes, eds))
//         },
//         [setEdges],
//     );
//     // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
//     // const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
//     const onConnect = useCallback(
//         (connection: any) => {
//             if (DEBUG) console.log(`[onConnect]`, `connection`, connection);
//             setEdges((eds: any) => addEdge({ ...connection }, eds))
//         },
//         [setEdges],
//     );

//     const nodeColor = (node: any) => {
//         switch (node.type) {
//             case 'input':
//                 return '#6ede87';
//             case 'output':
//                 return '#6865A5';
//             default:
//                 return '#ff0072';
//         }
//     };

//     const [variant, setVariant] = useState<any>('cross');

//     const PANEL_DESIGN = "font-mono text-[0.6rem]";
//     return <div style={{ width: '100%', height: '90vh' }}>
//         <ReactFlow nodes={nodes}
//             edges={edges}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             onConnect={onConnect}
//             defaultEdgeOptions={defaultEdgeOptions}

//             panOnScroll={true}
//             selectionOnDrag={true}

//             nodeTypes={nodeTypes}

//             fitView >
//             <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable />
//             <Controls />

//             <Panel position="top-left" className={`${PANEL_DESIGN}`}>top-left</Panel>
//             <Panel position="top-center" className={`${PANEL_DESIGN}`}>
//                 <button className="border-2 rounded-lg border-black" onClick={() => setVariant('dots')}>dots</button>
//                 <button className="border-2 rounded-lg border-black" onClick={() => setVariant('lines')}>lines</button>
//                 <button className="border-2 rounded-lg border-black" onClick={() => setVariant('cross')}>cross</button>
//             </Panel>
//             <Panel position="top-right" className={`${PANEL_DESIGN}`}>
//                 <button className="border-2 rounded-lg border-black" onClick={() => {
//                     console.log(`visibleCount`, visibleCount);
//                     setVisibleCount(visibleCount + ADDITIONAL_VISIBLE_COUNT);
//                     reDraw();
//                 }}>{ADDITIONAL_VISIBLE_COUNT}개 더보기</button>
//             </Panel>
//             <Panel position="bottom-left" className={`${PANEL_DESIGN}`}>bottom-left</Panel>
//             <Panel position="bottom-center" className={`${PANEL_DESIGN}`}>bottom-center</Panel>
//             <Panel position="bottom-right" className={`${PANEL_DESIGN}`}>bottom-right</Panel>
//             <Background color="#ccc" variant={variant} />
//         </ReactFlow>
//     </div>
// }

// export default Flow;