import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

// 1. Define the nodes (the boxes)
// Each node has a position {x, y}. For a horizontal tree, 
// increase 'x' for each level and 'y' for siblings.
const initialNodes = [
    {
        id: '1',
        data: { label: 'Parent Box: This can contain a large amount of descriptive text.' },
        position: { x: 0, y: 150 },
        style: { width: 200, padding: 10, borderRadius: 5, border: '1px solid #777' },
    },
    {
        id: '2',
        data: { label: 'Child A: Supporting details go here.' },
        position: { x: 300, y: 50 },
        style: { width: 200, padding: 10, borderRadius: 5, border: '1px solid #777' },
    },
    {
        id: '3',
        data: { label: 'Child B: Another branch with more text content.' },
        position: { x: 300, y: 250 },
        style: { width: 200, padding: 10, borderRadius: 5, border: '1px solid #777' },
    },
];

// 2. Define the edges (the connections)
const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3', animated: true },
];

const HorizontalTree = () => {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
                fitView // This centers the diagram automatically
            >
                <Background color="#aaa" gap={16} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default HorizontalTree;