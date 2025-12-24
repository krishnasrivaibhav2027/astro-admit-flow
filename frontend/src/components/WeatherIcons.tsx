import { Cloud, CloudRain, Moon, Sun, Wind } from "lucide-react";

export const SunnyIcon = () => (
    <div className="relative w-8 h-8">
        <Sun className="w-8 h-8 text-yellow-500 animate-[spin_10s_linear_infinite]" />
    </div>
);

export const CloudyIcon = () => (
    <div className="relative w-8 h-8">
        <Cloud className="w-8 h-8 text-gray-400 absolute top-0 left-0 animate-pulse" />
        <Cloud className="w-6 h-6 text-gray-300 absolute bottom-0 right-[-4px] opacity-80 animate-bounce delay-75" />
    </div>
);

export const RainyIcon = () => (
    <div className="relative w-8 h-8">
        <CloudRain className="w-8 h-8 text-blue-400 animate-pulse" />
        <div className="absolute bottom-0 left-1 w-0.5 h-1.5 bg-blue-500 rounded-full animate-[ping_1s_linear_infinite]" />
        <div className="absolute bottom-0 right-2 w-0.5 h-1.5 bg-blue-500 rounded-full animate-[ping_1.2s_linear_infinite]" />
    </div>
);

export const WindyIcon = () => (
    <div className="relative w-8 h-8">
        <Wind className="w-8 h-8 text-slate-400 animate-[pulse_2s_ease-in-out_infinite]" />
    </div>
);

export const MoonIcon = () => (
    <div className="relative w-8 h-8">
        <Moon className="w-8 h-8 text-indigo-300 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-0 w-8 h-8">
            <div className="w-1 h-1 rounded-full bg-white absolute top-1 right-2 animate-[ping_2s_linear_infinite]" />
            <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-4 right-1 animate-[ping_3s_linear_infinite]" />
        </div>
    </div>
);

export const WeatherIcon = ({ type }: { type: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'clear-night' }) => {
    switch (type) {
        case 'sunny': return <SunnyIcon />;
        case 'rainy': return <RainyIcon />;
        case 'cloudy': return <CloudyIcon />;
        case 'windy': return <WindyIcon />;
        case 'clear-night': return <MoonIcon />;
        default: return <SunnyIcon />;
    }
};
