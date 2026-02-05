import React, { useState, useEffect } from 'react';
import { Settings, Activity, Truck, AlertOctagon, Map as MapIcon, RotateCcw, Package, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import NetworkGraph from './components/NetworkGraph';
import ChatInterface from './components/ChatInterface';
import { WorldState, DisasterType, Node } from './types';
import { INITIAL_WORLD_STATE } from './constants';

const App: React.FC = () => {
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_WORLD_STATE);
  const [disasterType, setDisasterType] = useState<DisasterType>('Earthquake');
  const [severity, setSeverity] = useState<number>(7);

  // Dispatch State
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [amount, setAmount] = useState<number>(10);
  const [dispatchMessage, setDispatchMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);

  // Initialize Source to first available warehouse on load/reset
  useEffect(() => {
    const warehouse = worldState.nodes.find(n => n.type === 'Warehouse' && (n.supplies || 0) > 0);
    if (warehouse && !sourceId) {
        setSourceId(warehouse.id);
    }
  }, [worldState, sourceId]);

  // --- Simulation Actions ---

  const triggerBridgeCollapse = () => {
    setWorldState(prev => {
      // Deep copy to avoid mutation issues
      const newState = JSON.parse(JSON.stringify(prev)) as WorldState;
      
      // Find edge Village_B -> Zone_D and destroy it
      const edge = newState.edges.find(e => e.source === 'Village_B' && e.target === 'Zone_D');
      if (edge) {
        edge.status = 'Destroyed';
        edge.risk = 'High';
      }

      // Isolate Zone_D
      const node = newState.nodes.find(n => n.id === 'Zone_D');
      if (node) {
        node.status = 'CRITICAL (Isolated)';
      }
      return newState;
    });
    setDispatchMessage({ type: 'warning', text: 'Event: Bridge Collapse triggered!' });
  };

  const triggerConvoyArrival = () => {
    setWorldState(prev => {
      const newState = JSON.parse(JSON.stringify(prev)) as WorldState;
      const node = newState.nodes.find(n => n.id === 'Camp_C');
      if (node && node.needs) {
        node.needs = Math.max(0, node.needs - 50);
        node.status = 'Recovering';
      }
      return newState;
    });
    setDispatchMessage({ type: 'success', text: 'Event: External Convoy arrived at Camp C' });
  };
  
  const resetSimulation = () => {
    setWorldState(JSON.parse(JSON.stringify(INITIAL_WORLD_STATE)));
    setSourceId('');
    setTargetId('');
    setDispatchMessage(null);
  };

  const executeDispatch = () => {
    setDispatchMessage(null);
    if (!sourceId || !targetId || amount <= 0) return;

    setWorldState(prev => {
        const newState = JSON.parse(JSON.stringify(prev)) as WorldState;
        const sourceNode = newState.nodes.find(n => n.id === sourceId);
        const targetNode = newState.nodes.find(n => n.id === targetId);
        const edge = newState.edges.find(e => e.source === sourceId && e.target === targetId);

        if (!sourceNode || !targetNode) {
            setDispatchMessage({type: 'error', text: 'Invalid nodes selected.'});
            return prev;
        }

        if (!edge) {
             setDispatchMessage({type: 'error', text: 'No direct route exists.'});
             return prev;
        }

        if (edge.status === 'Destroyed') {
             setDispatchMessage({type: 'error', text: `Route ${sourceId} → ${targetId} is DESTROYED.`});
             return prev;
        }

        if (targetNode.status === 'Inaccessible' || targetNode.status === 'CRITICAL (Isolated)') {
             setDispatchMessage({type: 'error', text: `Target ${targetId} is inaccessible.`});
             return prev;
        }

        if ((sourceNode.supplies || 0) < amount) {
             setDispatchMessage({type: 'error', text: 'Insufficient supplies at source.'});
             return prev;
        }

        // Determine Outcome based on Risk
        let outcome: 'success' | 'failure' | 'delay' = 'success';
        
        if (edge.status === 'Damaged') {
             // 50% chance of failure on damaged roads
             if (Math.random() > 0.5) {
                  outcome = 'failure';
             } else {
                  outcome = 'delay';
             }
        } else if (edge.status === 'Congested') {
             outcome = 'delay';
        }

        // Execute Transaction
        sourceNode.supplies = (sourceNode.supplies || 0) - amount;

        if (outcome === 'failure') {
             setDispatchMessage({type: 'error', text: `FAILURE: Convoy lost on damaged route to ${targetId}!`});
             // Supplies lost, target gets nothing
        } else {
            // Success or Delay
            const receivedAmount = amount; // Could reduce for partial loss if needed
            
            if (targetNode.type === 'Demand') {
                targetNode.needs = Math.max(0, (targetNode.needs || 0) - receivedAmount);
                if (targetNode.needs === 0) targetNode.status = 'Stable';
                else if (targetNode.needs < 50) targetNode.status = 'Recovering';
            } else {
                targetNode.supplies = (targetNode.supplies || 0) + receivedAmount;
            }

            if (outcome === 'delay') {
                setDispatchMessage({type: 'warning', text: `WARNING: Supplies delivered to ${targetId} with delays (${edge.status}).`});
            } else {
                setDispatchMessage({type: 'success', text: `SUCCESS: ${receivedAmount} units delivered to ${targetId}.`});
            }
        }

        return newState;
    });
  };

  // Derived State for UI
  const sourceOptions = worldState.nodes.filter(n => (n.supplies || 0) > 0);
  const availableTargets = worldState.edges
    .filter(e => e.source === sourceId)
    .map(e => worldState.nodes.find(n => n.id === e.target))
    .filter(Boolean) as Node[];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Sidebar / Configuration Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-700 bg-slate-900 z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-3xl">🌐</span> ANCA
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium">System v1.0 | Gemini Pro</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* System Control */}
            <section>
                <div className="flex items-center gap-2 text-blue-400 mb-4">
                    <Settings className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">System Control</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Scenario Type</label>
                        <select 
                            value={disasterType}
                            onChange={(e) => setDisasterType(e.target.value as DisasterType)}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="Earthquake">Earthquake</option>
                            <option value="Flood">Flood</option>
                            <option value="Pandemic">Pandemic</option>
                            <option value="Conflict Displacement">Conflict Displacement</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 flex justify-between">
                            <span>Severity Level</span>
                            <span className="text-white font-bold">{severity}/10</span>
                        </label>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={severity}
                            onChange={(e) => setSeverity(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </section>

            <div className="w-full h-px bg-slate-800"></div>

            {/* Logistics Operations */}
            <section>
                 <div className="flex items-center gap-2 text-orange-400 mb-4">
                    <Package className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Logistics Operations</h3>
                </div>

                <div className="space-y-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Source Node</label>
                        <select 
                            value={sourceId}
                            onChange={(e) => {
                                setSourceId(e.target.value);
                                setTargetId(''); 
                                setDispatchMessage(null);
                            }}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none"
                        >
                            <option value="">Select Source</option>
                            {sourceOptions.map(n => (
                                <option key={n.id} value={n.id}>{n.id} ({n.supplies})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <ArrowRight className="text-slate-600 w-4 h-4" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Target Node</label>
                        <select 
                            value={targetId}
                            onChange={(e) => {
                                setTargetId(e.target.value);
                                setDispatchMessage(null);
                            }}
                            disabled={!sourceId}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none disabled:opacity-50"
                        >
                            <option value="">Select Target</option>
                            {availableTargets.map(n => (
                                <option key={n.id} value={n.id}>{n.id} (Needs: {n.needs || 0})</option>
                            ))}
                        </select>
                        {sourceId && availableTargets.length === 0 && (
                            <p className="text-[10px] text-red-400 mt-1">No routes available from {sourceId}</p>
                        )}
                    </div>

                    <div>
                         <label className="block text-[10px] font-medium text-slate-400 mb-1 flex justify-between">
                            <span>Amount</span>
                            <span>{amount} Units</span>
                        </label>
                        <input 
                            type="range" 
                            min="1" 
                            max={sourceOptions.find(n => n.id === sourceId)?.supplies || 100} 
                            value={amount}
                            onChange={(e) => setAmount(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>

                    <button 
                        onClick={executeDispatch}
                        disabled={!sourceId || !targetId || !amount}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Truck size={14} /> Dispatch Convoy
                    </button>
                    
                    {dispatchMessage && (
                        <div className={`text-[10px] p-2 rounded border flex items-start gap-2 ${
                            dispatchMessage.type === 'error' ? 'bg-red-900/30 border-red-800 text-red-200' :
                            dispatchMessage.type === 'warning' ? 'bg-yellow-900/30 border-yellow-800 text-yellow-200' :
                            'bg-green-900/30 border-green-800 text-green-200'
                        }`}>
                            {dispatchMessage.type === 'error' ? <AlertTriangle size={12} className="shrink-0 mt-0.5" /> : 
                             dispatchMessage.type === 'warning' ? <AlertOctagon size={12} className="shrink-0 mt-0.5" /> :
                             <CheckCircle size={12} className="shrink-0 mt-0.5" />}
                            <span>{dispatchMessage.text}</span>
                        </div>
                    )}
                </div>
            </section>

            <div className="w-full h-px bg-slate-800"></div>

            {/* Simulation Injectors */}
            <section>
                <div className="flex items-center gap-2 text-emerald-400 mb-4">
                    <Activity className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Inject Event</h3>
                </div>
                
                <div className="space-y-3">
                    <button 
                        onClick={triggerBridgeCollapse}
                        className="w-full flex items-center gap-3 bg-slate-800 hover:bg-red-900/30 border border-slate-600 hover:border-red-500/50 p-3 rounded-lg text-sm text-left transition-all group"
                    >
                        <div className="p-2 bg-slate-700 rounded group-hover:bg-red-500/20 text-red-400">
                             <AlertOctagon size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-200">Bridge Collapse</div>
                            <div className="text-[10px] text-slate-400">Route B → D Destroyed</div>
                        </div>
                    </button>

                    <button 
                        onClick={triggerConvoyArrival}
                        className="w-full flex items-center gap-3 bg-slate-800 hover:bg-emerald-900/30 border border-slate-600 hover:border-emerald-500/50 p-3 rounded-lg text-sm text-left transition-all group"
                    >
                         <div className="p-2 bg-slate-700 rounded group-hover:bg-emerald-500/20 text-emerald-400">
                             <Truck size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-200">NGO Convoy</div>
                            <div className="text-[10px] text-slate-400">Arrives at Camp C</div>
                        </div>
                    </button>
                    
                     <button 
                        onClick={resetSimulation}
                        className="w-full flex items-center justify-center gap-2 mt-6 text-xs text-slate-500 hover:text-white transition-colors"
                    >
                        <RotateCcw size={12} /> Reset Simulation
                    </button>
                </div>
            </section>
        </div>
        
        <div className="p-4 bg-slate-800/50 text-[10px] text-slate-500 text-center border-t border-slate-700">
            ANCA is an advisory system.<br/>It does not execute commands.
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full">
        
        {/* Left: World Visualization */}
        <div className="flex-1 flex flex-col bg-slate-900 relative">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded border border-slate-700">
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-slate-200">Live Situation: {disasterType}</span>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
                <NetworkGraph worldState={worldState} />
            </div>

            {/* Data Table Panel (Bottom of Visualization) */}
            <div className="h-48 bg-slate-800 border-t border-slate-700 overflow-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 font-medium">Node ID</th>
                            <th className="px-4 py-2 font-medium">Type</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium text-right">Metric</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {worldState.nodes.map(node => (
                            <tr key={node.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-4 py-2 font-bold text-slate-200">{node.id}</td>
                                <td className="px-4 py-2 text-slate-400">{node.type}</td>
                                <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        node.status.includes('Critical') || node.status.includes('CRITICAL') 
                                        ? 'bg-red-400/10 text-red-400 border-red-400/20'
                                        : node.status === 'Inaccessible'
                                        ? 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                                        : node.status === 'Operational'
                                        ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                        : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                                    }`}>
                                        {node.status}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right text-slate-300 font-mono">
                                    {node.type === 'Warehouse' ? `${node.supplies} Units` : `${node.needs} Needs`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Right: Chat Interface */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 h-full">
            <ChatInterface 
                worldState={worldState} 
                disasterType={disasterType}
                severity={severity}
            />
        </div>

      </div>
    </div>
  );
};

export default App;