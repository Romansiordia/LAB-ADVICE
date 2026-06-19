import React, { useMemo } from 'react';
import { ThresholdRange } from '../constants';

interface MycotoxinGaugeProps {
    value: number;
    maxObserved: number;
    thresholds: ThresholdRange;
    label: string;
    unit: string;
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY - radius * Math.sin(angleInRadians)
    };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, endAngle);
    const largeArcFlag = Math.abs(startAngle - endAngle) <= 180 ? "0" : "1";
    // Using sweep flag 0 for counter-clockwise / decrementing angle path
    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
};

export const MycotoxinGauge: React.FC<MycotoxinGaugeProps> = ({ value, maxObserved, thresholds, label, unit }) => {
    const { min, max, part1_max, part2_max } = thresholds;

    // Get current status color and classification
    const { color, labelStatus, textClass, bgClass, borderClass } = useMemo(() => {
        if (value <= part1_max) {
            return {
                color: '#10b981', // Emerald
                labelStatus: 'BAJO (Seguro)',
                textClass: 'text-emerald-400',
                bgClass: 'bg-emerald-500/10',
                borderClass: 'border-emerald-500/20'
            };
        } else if (value <= part2_max) {
            return {
                color: '#f59e0b', // Amber
                labelStatus: 'MEDIO (Límite)',
                textClass: 'text-amber-400',
                bgClass: 'bg-amber-500/10',
                borderClass: 'border-amber-500/20'
            };
        } else {
            return {
                color: '#ef4444', // Red
                labelStatus: 'ALTO (Riesgo)',
                textClass: 'text-red-400',
                bgClass: 'bg-red-500/10',
                borderClass: 'border-red-500/20'
            };
        }
    }, [value, part1_max, part2_max]);

    // Calculate angles
    // 0 to max matches 180 to 0 degrees
    const valuePercentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const needleAngle = 180 - (valuePercentage * 180);

    const part1Percentage = Math.min(Math.max((part1_max - min) / (max - min), 0), 1);
    const part1Angle = 180 - (part1Percentage * 180);

    const part2Percentage = Math.min(Math.max((part2_max - min) / (max - min), 0), 1);
    const part2Angle = 180 - (part2Percentage * 180);

    // SVG coordinates for needle line
    const center = { x: 100, y: 95 };
    const radius = 65;
    const needleTip = polarToCartesian(center.x, center.y, radius - 10, needleAngle);

    // Coordinates for threshold marks
    const part1MarkInner = polarToCartesian(center.x, center.y, radius - 8, part1Angle);
    const part1MarkOuter = polarToCartesian(center.x, center.y, radius + 8, part1Angle);
    const part2MarkInner = polarToCartesian(center.x, center.y, radius - 8, part2Angle);
    const part2MarkOuter = polarToCartesian(center.x, center.y, radius + 8, part2Angle);

    return (
        <div id={`gauge-card-${label.toLowerCase().replace(/\s+/g, '-')}`} className="bg-ui-card rounded-xl border border-ui-border p-5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden group hover:border-[#38bdf8]/30 transition-all duration-300">
            <div className="w-full flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">{label}</h4>
                    <p className="text-[10px] text-slate-400">Límites para especie destino</p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bgClass} ${textClass} ${borderClass}`}>
                    {labelStatus}
                </div>
            </div>

            {/* Speeder Canvas */}
            <div className="relative w-44 h-24 mb-3 flex items-end justify-center">
                <svg className="w-full h-full" viewBox="0 0 200 110">
                    {/* Background Arc */}
                    <path
                        d={describeArc(center.x, center.y, radius, 180, 0)}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />

                    {/* Green Segment (Safe Zone) */}
                    <path
                        d={describeArc(center.x, center.y, radius, 180, part1Angle)}
                        fill="none"
                        stroke="#10b981"
                        strokeOpacity="0.4"
                        strokeWidth="10"
                    />

                    {/* Amber Segment (Moderate Zone) */}
                    <path
                        d={describeArc(center.x, center.y, radius, part1Angle, part2Angle)}
                        fill="none"
                        stroke="#f59e0b"
                        strokeOpacity="0.4"
                        strokeWidth="10"
                    />

                    {/* Red Segment (High Risk Zone) */}
                    <path
                        d={describeArc(center.x, center.y, radius, part2Angle, 0)}
                        fill="none"
                        stroke="#ef4444"
                        strokeOpacity="0.4"
                        strokeWidth="10"
                    />

                    {/* Colored Active Progress Arc */}
                    {valuePercentage > 0 && (
                        <path
                            d={describeArc(center.x, center.y, radius, 180, needleAngle)}
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                        />
                    )}

                    {/* Part 1 Limit Marker */}
                    <line
                        x1={part1MarkInner.x}
                        y1={part1MarkInner.y}
                        x2={part1MarkOuter.x}
                        y2={part1MarkOuter.y}
                        stroke="#f8fafc"
                        strokeWidth="2"
                    />

                    {/* Part 2 Limit Marker */}
                    <line
                        x1={part2MarkInner.x}
                        y1={part2MarkInner.y}
                        x2={part2MarkOuter.x}
                        y2={part2MarkOuter.y}
                        stroke="#f8fafc"
                        strokeWidth="2"
                    />

                    {/* Needle */}
                    <line
                        x1={center.x}
                        y1={center.y}
                        x2={needleTip.x}
                        y2={needleTip.y}
                        stroke={color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />

                    {/* Center Pin */}
                    <circle cx={center.x} cy={center.y} r="5" fill="#f8fafc" />
                    <circle cx={center.x} cy={center.y} r="2.5" fill={color} />
                </svg>

                {/* Left/Right Threshold Limits labels */}
                <div className="absolute -bottom-1 left-2 text-[9px] font-mono text-slate-500">0</div>
                <div className="absolute -bottom-1 right-2 text-[9px] font-mono text-slate-500">{max}</div>
            </div>

            {/* Readout stats */}
            <div className="w-full grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-center text-[10px]">
                <div>
                    <span className="block text-slate-500 uppercase tracking-wider text-[9px]">Promedio</span>
                    <span className="font-bold font-mono text-slate-200 text-xs">{value.toFixed(2)}{unit}</span>
                </div>
                <div>
                    <span className="block text-slate-500 uppercase tracking-wider text-[9px]">Límite S.</span>
                    <span className="font-semibold font-mono text-emerald-400">{part1_max}{unit}</span>
                </div>
                <div>
                    <span className="block text-slate-500 uppercase tracking-wider text-[9px]">Máx Obs.</span>
                    <span className="font-bold font-mono text-red-400 text-xs">{maxObserved.toFixed(2)}{unit}</span>
                </div>
            </div>
        </div>
    );
};
