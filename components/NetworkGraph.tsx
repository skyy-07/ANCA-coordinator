import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { WorldState, Node, Edge } from '../types';

interface NetworkGraphProps {
  worldState: WorldState;
  className?: string;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ worldState, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !worldState) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;
    const margin = 20;

    // Type casting for D3 simulation nodes/links
    const nodes = worldState.nodes.map(n => ({ ...n })) as (Node & d3.SimulationNodeDatum)[];
    const links = worldState.edges.map(e => ({ ...e })) as (Edge & d3.SimulationLinkDatum<Node & d3.SimulationNodeDatum>)[];

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(50));

    // Define arrow markers
    const defs = svg.append("defs");
    
    // Normal Arrow
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8"); // slate-400

    // Red Arrow for Congested
    defs.append("marker")
      .attr("id", "arrowhead-congested")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#ef4444"); // red-500

     // Render Links (Lines)
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 2)
      .attr("stroke", (d) => d.status === 'Congested' ? '#ef4444' : '#94a3b8')
      .attr("stroke-dasharray", (d) => (d.status === 'Damaged' || d.status === 'Destroyed') ? "5,5" : "none")
      .attr("marker-end", (d) => d.status === 'Congested' ? "url(#arrowhead-congested)" : "url(#arrowhead)");

    // Render Nodes (Circles)
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d) => {
        if (d.status === 'Critical' || d.status === 'CRITICAL (Isolated)') return '#ef4444'; // red-500
        if (d.status === 'Inaccessible') return '#64748b'; // slate-500
        if (d.status === 'Stable' || d.status === 'Recovering') return '#22c55e'; // green-500
        return '#3b82f6'; // blue-500 for Operational/Warehouse
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Labels
    node.append("text")
      .text((d) => d.id)
      .attr("x", 25)
      .attr("y", 5)
      .attr("fill", "#f1f5f9") // slate-100
      .attr("font-size", "12px")
      .attr("font-weight", "bold");
      
    // Status text below
    node.append("text")
      .text((d) => `(${d.status})`)
      .attr("x", 25)
      .attr("y", 20)
      .attr("fill", "#cbd5e1") // slate-300
      .attr("font-size", "10px");
      
    // Needs/Supplies Text
    node.append("text")
      .text((d) => d.type === 'Warehouse' ? `Supplies: ${d.supplies}` : `Needs: ${d.needs}`)
      .attr("x", 25)
      .attr("y", 35)
      .attr("fill", "#94a3b8") // slate-400
      .attr("font-size", "10px")
      .attr("font-style", "italic");


    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [worldState, dimensions]);

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '400px' }}></svg>
        <div className="absolute top-2 right-2 bg-slate-800/80 p-2 rounded text-xs text-slate-300 border border-slate-700 pointer-events-none">
            <h4 className="font-bold mb-1 border-b border-slate-600 pb-1">Legend</h4>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Warehouse</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Stable/Recovering</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-slate-500"></span> Inaccessible</div>
            <div className="flex items-center gap-2 mt-2"><span className="w-4 h-0.5 bg-slate-400"></span> Clear Route</div>
            <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></span> Damaged Route</div>
        </div>
    </div>
  );
};

export default NetworkGraph;
