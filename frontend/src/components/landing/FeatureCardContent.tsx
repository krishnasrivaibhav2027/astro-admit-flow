import { LucideIcon } from "lucide-react";

interface Feature {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
    gradient: string;
}

interface FeatureCardContentProps {
    feature: Feature;
    isActive: boolean;
}

export function FeatureCardContent({ feature, isActive }: FeatureCardContentProps) {
    const Icon = feature.icon;

    return (
        <div className={`
      h-[300px] p-8 rounded-3xl border transition-all duration-500
      flex flex-col justify-between
      ${isActive
                ? "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 scale-100"
                : "bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 opacity-70 scale-95 grayscale-[0.5]"}
    `}>
            <div>
                <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center mb-6
          bg-gradient-to-br ${feature.gradient} shadow-lg
        `}>
                    <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className={`text-2xl font-bold mb-3 text-slate-900 dark:text-white transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                    {feature.title}
                </h3>

                <p className={`text-slate-600 dark:text-slate-400 leading-relaxed transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {feature.description}
                </p>
            </div>

            {/* Progress Bar Decoration */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-6">
                <div className={`h-full rounded-full bg-gradient-to-r ${feature.gradient} w-2/3`} />
            </div>
        </div>
    );
}
