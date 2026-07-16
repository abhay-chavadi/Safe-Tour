import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { IncidentReport, BroadcastAlert } from '../types';
import { Calendar, Clock, Filter, Layers, ZoomIn, ZoomOut, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface IncidentTimelineProps {
  incidentReports: IncidentReport[];
  broadcasts: BroadcastAlert[];
  onSelectIncident: (lat: number, lng: number) => void;
}

interface TimelineItem {
  id: string;
  type: 'incident' | 'broadcast';
  title: string;
  message: string;
  time: Date;
  lat?: number;
  lng?: number;
  status: 'pending' | 'resolved' | 'broadcast';
  severity?: 'warning' | 'info' | 'critical';
  reporter?: string;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  incidentReports,
  broadcasts,
  onSelectIncident
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Dimensions state managed by ResizeObserver
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });
  const [filterType, setFilterType] = useState<'all' | 'incident' | 'broadcast'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<TimelineItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [timeRangeHours, setTimeRangeHours] = useState<number>(6); // Default show last 6 hours

  // 1. Observe container size changes fluidly
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ 
        width: Math.max(width, 300), 
        height: Math.max(height, 240) 
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Prepare merged timeline data
  const getTimelineData = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Add incident reports
    incidentReports.forEach(r => {
      items.push({
        id: r.id,
        type: 'incident',
        title: `Incident: ${r.status.toUpperCase()}`,
        message: r.message,
        time: new Date(r.timestamp),
        lat: r.lat,
        lng: r.lng,
        status: r.status,
        reporter: r.touristName
      });
    });

    // Add broadcast alerts
    broadcasts.forEach(b => {
      items.push({
        id: b.id,
        type: 'broadcast',
        title: `Broadcast: ${b.severity.toUpperCase()}`,
        message: b.message,
        time: new Date(b.timestamp),
        status: 'broadcast',
        severity: b.severity
      });
    });

    let filtered = items;
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.message.toLowerCase().includes(q) || 
        item.title.toLowerCase().includes(q) ||
        (item.reporter && item.reporter.toLowerCase().includes(q))
      );
    }

    const cutoffTime = Date.now() - timeRangeHours * 60 * 60 * 1000;
    filtered = filtered.filter(item => item.time.getTime() >= cutoffTime);

    return filtered.sort((a, b) => b.time.getTime() - a.time.getTime());
  };

  const timelineItems = getTimelineData();

  // 3. Draw Timeline using D3 (Polished for Light Mode)
  useEffect(() => {
    if (!svgRef.current) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const { width, height } = dimensions;
    const paddingLeft = 130; // Extra room for track labels on left
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 45;

    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + 10 * 60 * 1000);

    // Create scales
    const xScale = d3.scaleTime()
      .domain([startTime, endTime])
      .range([paddingLeft, width - paddingRight]);

    // Define Tracks on Y-axis
    const tracks = [
      { id: 'pending', label: '🚨 ACTIVE INCIDENTS', y: paddingTop + (height - paddingTop - paddingBottom) * 0.15 },
      { id: 'resolved', label: '✅ RESOLVED', y: paddingTop + (height - paddingTop - paddingBottom) * 0.5 },
      { id: 'broadcast', label: '📡 BROADCASTS', y: paddingTop + (height - paddingTop - paddingBottom) * 0.85 }
    ];

    const getTrackY = (status: 'pending' | 'resolved' | 'broadcast') => {
      const track = tracks.find(t => t.id === status);
      return track ? track.y : paddingTop + (height - paddingTop - paddingBottom) / 2;
    };

    // Draw horizontal track lanes (dashed background lines)
    tracks.forEach(track => {
      // Lane background highlight (Very soft light gray)
      svgElement.append('rect')
        .attr('x', paddingLeft - 10)
        .attr('y', track.y - 18)
        .attr('width', width - paddingLeft - paddingRight + 20)
        .attr('height', 36)
        .attr('fill', 'rgba(0, 0, 0, 0.012)')
        .attr('rx', 6);

      // Dash line (Subtle gray separator)
      svgElement.append('line')
        .attr('x1', paddingLeft)
        .attr('y1', track.y)
        .attr('x2', width - paddingRight)
        .attr('y2', track.y)
        .attr('stroke', 'rgba(0, 0, 0, 0.05)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');

      // Track Text Label (Polished, clean colors)
      svgElement.append('text')
        .attr('x', 15)
        .attr('y', track.y + 4)
        .attr('fill', track.id === 'pending' ? '#ef4444' : track.id === 'resolved' ? '#10b981' : '#b45309')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .attr('letter-spacing', '0.05em')
        .text(track.label);
    });

    // Draw vertical Current Time "NOW" line
    const nowX = xScale(now);
    if (nowX >= paddingLeft && nowX <= width - paddingRight) {
      svgElement.append('line')
        .attr('x1', nowX)
        .attr('y1', paddingTop - 10)
        .attr('x2', nowX)
        .attr('y2', height - paddingBottom)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2')
        .style('opacity', 0.5);

      // 'NOW' Flag Background
      svgElement.append('rect')
        .attr('x', nowX - 16)
        .attr('y', paddingTop - 22)
        .attr('width', 32)
        .attr('height', 12)
        .attr('fill', '#ef4444')
        .attr('rx', 2);

      // 'NOW' Flag Text
      svgElement.append('text')
        .attr('x', nowX)
        .attr('y', paddingTop - 13)
        .attr('fill', '#ffffff')
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'extrabold')
        .text('NOW');
    }

    // Grid Tick Lines
    const ticks = xScale.ticks(5);
    ticks.forEach(tick => {
      const x = xScale(tick);
      if (x < paddingLeft || x > width - paddingRight) return;
      svgElement.append('line')
        .attr('x1', x)
        .attr('y1', paddingTop)
        .attr('x2', x)
        .attr('y2', height - paddingBottom)
        .attr('stroke', 'rgba(0, 0, 0, 0.03)')
        .attr('stroke-width', 1);
    });

    // Draw X-Axis Time Labels
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => {
        const date = d as Date;
        return d3.timeFormat('%H:%M:%S')(date);
      });

    const axisG = svgElement.append('g')
      .attr('transform', `translate(0, ${height - paddingBottom})`)
      .call(xAxis);

    axisG.select('.domain')
      .attr('stroke', 'rgba(0, 0, 0, 0.1)')
      .attr('stroke-width', 1);
    axisG.selectAll('.tick line')
      .attr('stroke', 'rgba(0, 0, 0, 0.1)');
    axisG.selectAll('.tick text')
      .attr('fill', '#475569')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('dy', '10px');

    // Draw data points
    const gPoints = svgElement.append('g').attr('id', 'timeline-nodes');

    timelineItems.forEach(item => {
      const cx = xScale(item.time);
      const cy = getTrackY(item.status);

      if (cx < paddingLeft || cx > width - paddingRight) return;

      // Color coding (Polished high-contrast for light mode)
      let color = '#2563eb'; // blue
      let glowColor = 'rgba(37, 99, 235, 0.3)';
      if (item.status === 'pending') {
        color = '#dc2626'; // red
        glowColor = 'rgba(220, 38, 38, 0.4)';
      } else if (item.status === 'resolved') {
        color = '#059669'; // emerald
        glowColor = 'rgba(5, 150, 105, 0.3)';
      } else if (item.status === 'broadcast') {
        if (item.severity === 'critical') {
          color = '#e11d48'; // critical rose
          glowColor = 'rgba(225, 29, 72, 0.4)';
        } else if (item.severity === 'warning') {
          color = '#d97706'; // amber
          glowColor = 'rgba(217, 119, 6, 0.3)';
        } else {
          color = '#2563eb';
          glowColor = 'rgba(37, 99, 235, 0.25)';
        }
      }

      const isSelected = selectedItem?.id === item.id;

      // Pulse ring for pending incidents
      if (item.status === 'pending') {
        gPoints.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 12)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .style('opacity', 0.6)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '6;20;6')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      }

      // Outer Selection Glow Ring
      if (isSelected) {
        gPoints.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 9)
          .attr('fill', 'none')
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 1.5)
          .style('opacity', 0.9);
      }

      // Interactive Group
      const nodeG = gPoints.append('g')
        .style('cursor', 'pointer')
        .on('mouseover', () => {
          setHoveredItem(item);
        })
        .on('mouseleave', () => {
          setHoveredItem(null);
        })
        .on('click', () => {
          setSelectedItem(item);
          if (item.lat && item.lng) {
            onSelectIncident(item.lat, item.lng);
          }
        });

      nodeG.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 14)
        .attr('fill', 'transparent');

      // The actual node circle
      nodeG.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isSelected ? 6.5 : 5)
        .attr('fill', color)
        .attr('stroke', isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.8)')
        .attr('stroke-width', 1.5)
        .style('filter', `drop-shadow(0px 1px 3px ${glowColor})`)
        .style('transition', 'all 0.15s ease-in-out');

      if (item.status === 'pending' && !isSelected) {
        nodeG.append('text')
          .attr('x', cx)
          .attr('y', cy - 10)
          .attr('fill', '#dc2626')
          .attr('text-anchor', 'middle')
          .attr('font-size', '7px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'extrabold')
          .text('ALERT');
      }
    });

  }, [dimensions, timelineItems, selectedItem, timeRangeHours]);

  return (
    <div className="p-6 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm relative overflow-hidden flex flex-col h-full min-h-[360px]" id="incident-feed-panel">
      {/* Visual top HUD overlay */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-sm font-mono font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600 animate-pulse" />
            REAL-TIME INCIDENT & BROADCAST TIMELINE
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            Displays central telemetry alarms and dispatched ranger broadcasts using D3 visualization
          </span>
        </div>

        {/* Time-range presets */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 self-end sm:self-auto shadow-inner">
          <Clock className="w-3 h-3 text-slate-400 ml-1.5" />
          <span className="text-[9px] text-slate-400 font-mono uppercase mr-1">RNG:</span>
          {[2, 6, 12, 24].map(hours => (
            <button
              key={hours}
              onClick={() => setTimeRangeHours(hours)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-mono transition-all cursor-pointer ${
                timeRangeHours === hours
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {hours}H
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-xs">
        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {[
            { id: 'all', label: 'ALL DATA' },
            { id: 'incident', label: 'INCIDENTS' },
            { id: 'broadcast', label: 'BROADCASTS' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                filterType === opt.id
                ? 'bg-white text-emerald-700 border border-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative min-w-0">
          <input
            type="text"
            placeholder="Filter by keyword / message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 rounded-lg px-2.5 py-1 text-[11px] placeholder:text-slate-400 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* SVG Canvas Holder */}
      <div ref={containerRef} className="flex-1 w-full min-h-[160px] relative bg-slate-50/50 border border-slate-200/60 rounded-xl overflow-hidden mb-3">
        {timelineItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs font-mono gap-1.5 p-4 bg-slate-100/10">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            <span className="font-bold">NO ALERTS FOUND IN SELECTED TIME RANGE ({timeRangeHours}H)</span>
            <span className="text-[10px] text-slate-400 font-normal">Use the simulator to submit incidents or broadcast warning alerts</span>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" style={{ display: 'block' }} />
        )}

        {/* Direct Floating D3-Driven Tooltip */}
        {hoveredItem && (
          <div 
            className="absolute z-10 bottom-3 right-3 max-w-[280px] p-3 rounded-xl border bg-white border-slate-200 shadow-xl text-slate-700 font-mono text-[10px] leading-relaxed transition-all pointer-events-none"
            style={{ animation: 'fadeIn 0.15s ease-out' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 gap-2">
              <span className={`font-bold flex items-center gap-1 ${
                hoveredItem.status === 'pending' ? 'text-red-600' : hoveredItem.status === 'resolved' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {hoveredItem.status === 'pending' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                {hoveredItem.status === 'resolved' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                {hoveredItem.status === 'broadcast' && <Info className="w-3 h-3 text-amber-500" />}
                {hoveredItem.title}
              </span>
              <span className="text-slate-400 font-bold">{hoveredItem.time.toLocaleTimeString()}</span>
            </div>
            
            {hoveredItem.reporter && (
              <div className="text-slate-500 mb-1">
                Reporter: <span className="text-slate-800 font-bold">{hoveredItem.reporter}</span>
              </div>
            )}

            <div className="text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 mb-1.5 max-h-[80px] overflow-hidden truncate whitespace-normal font-sans">
              "{hoveredItem.message}"
            </div>

            {hoveredItem.lat && hoveredItem.lng && (
              <div className="flex justify-between text-slate-400 text-[9px] border-t border-slate-100 pt-1.5 mt-1">
                <span>LAT: {hoveredItem.lat.toFixed(5)}</span>
                <span>LNG: {hoveredItem.lng.toFixed(5)}</span>
              </div>
            )}
            <div className="text-[8px] text-emerald-600 font-bold text-center mt-1 animate-pulse">
              {hoveredItem.lat ? '👉 CLICK NODE TO CENTER CENTRAL MAP' : '📡 DISPATCHED EMERGENCY BROADCAST'}
            </div>
          </div>
        )}
      </div>

      {/* Selected Item Telemetry Reader */}
      {selectedItem ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 font-mono text-[11px] animate-fade-in animate-duration-150 relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold text-[10px]">SELECTED TELEMETRY NODE:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                selectedItem.status === 'pending' ? 'bg-red-50 text-red-600 border border-red-100' : selectedItem.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                {selectedItem.status}
              </span>
            </div>
            <div className="text-slate-800 text-xs leading-relaxed max-w-3xl font-sans">
              <span className="font-medium text-slate-700">"{selectedItem.message}"</span>
            </div>
            {selectedItem.lat && (
              <div className="text-slate-500 text-[10px]">
                Coordinates: <span className="text-emerald-600 font-bold underline">{selectedItem.lat.toFixed(5)}, {selectedItem.lng.toFixed(5)}</span>
                {selectedItem.reporter && <> • Reported By: <span className="text-slate-600 font-bold">{selectedItem.reporter}</span></>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {selectedItem.lat && selectedItem.lng && (
              <button
                onClick={() => onSelectIncident(selectedItem.lat!, selectedItem.lng!)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm"
              >
                <ZoomIn className="w-3.5 h-3.5" /> RE-CENTER MAP
              </button>
            )}
            <button
              onClick={() => setSelectedItem(null)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] uppercase cursor-pointer transition-all shadow-sm"
            >
              CLEAR
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 font-mono text-[10px] uppercase tracking-wider py-4 bg-slate-50/50">
          SELECT A GRID TELEMETRY NODE TO ACCESS SATELLITE GPS LOCK-ON AND MAP POSITIONING
        </div>
      )}
    </div>
  );
};
