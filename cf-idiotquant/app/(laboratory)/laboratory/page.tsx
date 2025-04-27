"use client";

import { useCallback, useState } from 'react';

import { ReactFlow, MiniMap, Controls, Background, Panel, Handle } from '@xyflow/react';
import { addEdge, applyEdgeChanges, applyNodeChanges, useEdgesState, useNodesState } from '@xyflow/react';
import { Position } from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { CustomSourceNode, DateNode, StockNode } from './custom_node';

const initialNodes = [
    {
        id: 'date-2025-04-25',
        type: 'dateNode',
        data: { label: '2025-04-25' },
        position: { x: 0, y: 0 }
    },
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
        position: { x: 10, y: 50 }
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
        position: { x: 10, y: 150 }
    },
    {
        id: 'date-2025-04-26',
        type: 'dateNode',
        data: { label: '2025-04-26' },
        position: { x: 100, y: 0 }
    },
    {
        id: 'buy-삼성전자-2025-04-26',
        type: 'stockNode',
        data: {
            action: 'buy',
            stockName: '삼성전자',
            quantity: 10,
            price: 71500,
            profitRate: 5.4,    // 수익률
            points: 22          // 포인트 적립
        },
        position: { x: 110, y: 50 }
    },
    {
        id: 'sell-현대차-2025-04-26',
        type: 'stockNode',
        data: {
            action: 'sell',
            stockName: '현대차',
            quantity: 5,
            price: 180000,
            profitRate: -2.3,   // 손실
            points: 22
        },
        position: { x: 110, y: 150 }
    },
    {
        id: '1',
        // type: 'input',
        type: 'customSourceNode',
        data: { label: 'Input Node', value: 'input' },
        position: { x: 250, y: 25 },
    },

    {
        id: '2',
        // you can also pass a React component as a label
        data: { label: <div>Default Node</div> },
        position: { x: 100, y: 125 },
    },
    {
        id: '3',
        type: 'output',
        data: { label: 'Output Node' },
        position: { x: 250, y: 250 },
    },
];

const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e-date-2025-04-25--buy-삼성전자-2025-04-25', source: 'date-2025-04-25', sourceHandle: 'b', target: 'buy-삼성전자-2025-04-25', animated: true },
    { id: 'e-buy-삼성전자-2025-04-25--sell-현대차-2025-04-25', source: 'buy-삼성전자-2025-04-25', target: 'sell-현대차-2025-04-25', animated: true },
    { id: 'e-date-2025-04-25--date-2025-04-26', source: 'date-2025-04-25', sourceHandle: 'a', target: 'date-2025-04-26', animated: true },
    { id: 'e-date-2025-04-26--buy-삼성전자-2025-04-26', source: 'date-2025-04-26', sourceHandle: 'b', target: 'buy-삼성전자-2025-04-26', animated: true },
    { id: 'e-buy-삼성전자-2025-04-26--sell-현대차-2025-04-26', source: 'buy-삼성전자-2025-04-26', target: 'sell-현대차-2025-04-26', animated: true },
];
// const defaultEdgeOptions = { animated: true, style: { stroke: '#f6ab00', strokeWidth: 2 }, type: 'step' };
const defaultEdgeOptions = { animated: true, style: { stroke: '#f6ab00', strokeWidth: 2 } };

function Flow() {
    const nodeTypes = {
        dateNode: DateNode,
        stockNode: StockNode,
        customSourceNode: CustomSourceNode,
    };

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const onNodesChange = useCallback(
        (changes: any) => {
            console.log(`[onNodesChange]`, `changes`, changes);
            setNodes((nds) => applyNodeChanges(changes, nds))
        },
        [setNodes],
    );
    const onEdgesChange = useCallback(
        (changes: any) => {
            console.log(`[onEdgesChange]`, `changes`, changes);
            setEdges((eds) => applyEdgeChanges(changes, eds))
        },
        [setEdges],
    );
    // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    // const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const onConnect = useCallback(
        (connection: any) => {
            console.log(`[onConnect]`, `connection`, connection);
            setEdges((eds) => addEdge({ ...connection }, eds))
        },
        [setEdges],
    );

    const nodeColor = (node: any) => {
        switch (node.type) {
            case 'input':
                return '#6ede87';
            case 'output':
                return '#6865A5';
            default:
                return '#ff0072';
        }
    };

    const [variant, setVariant] = useState<any>('cross');

    const PANEL_DESIGN = "font-mono text-[0.6rem]";
    return <div style={{ width: '100%', height: '90vh' }}>
        <ReactFlow nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            defaultEdgeOptions={defaultEdgeOptions}

            panOnScroll={true}
            selectionOnDrag={true}

            nodeTypes={nodeTypes}

            fitView >
            <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable />
            <Controls />

            <Panel position="top-left" className={`${PANEL_DESIGN}`}>top-left</Panel>
            <Panel position="top-center" className={`${PANEL_DESIGN}`}>
                <button className="border-2 rounded-lg border-black" onClick={() => setVariant('dots')}>dots</button>
                <button className="border-2 rounded-lg border-black" onClick={() => setVariant('lines')}>lines</button>
                <button className="border-2 rounded-lg border-black" onClick={() => setVariant('cross')}>cross</button>
            </Panel>
            <Panel position="top-right" className={`${PANEL_DESIGN}`}>top-right</Panel>
            <Panel position="bottom-left" className={`${PANEL_DESIGN}`}>bottom-left</Panel>
            <Panel position="bottom-center" className={`${PANEL_DESIGN}`}>bottom-center</Panel>
            <Panel position="bottom-right" className={`${PANEL_DESIGN}`}>bottom-right</Panel>
            <Background color="#ccc" variant={variant} />
        </ReactFlow>
    </div>
}

export default Flow;