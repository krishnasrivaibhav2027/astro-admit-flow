import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { features } from "../../data/features";
import { FeatureCardContent } from "./FeatureCardContent";

export function ParallaxCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => handleNext(), 4000);
        return () => clearInterval(timer);
    }, [currentIndex]);

    const handleNext = () => {
        setCurrentIndex((prev) => prev + 1);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => prev - 1);
    };

    const getVisibleCards = () => {
        const cards = [];
        for (let i = -2; i <= 2; i++) {
            const itemIndex = currentIndex + i;
            const featureIndex = ((itemIndex % features.length) + features.length) % features.length;
            cards.push({
                feature: features[featureIndex],
                position: i,
                key: itemIndex
            });
        }
        return cards;
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            <div className="relative h-[450px] flex items-center justify-center overflow-hidden">
                <button
                    onClick={handlePrev}
                    className="absolute left-0 md:left-4 z-20 size-12 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:scale-110 text-slate-900 dark:text-white shadow-lg"
                >
                    <ChevronLeft className="size-6" />
                </button>

                <button
                    onClick={handleNext}
                    className="absolute right-0 md:right-4 z-20 size-12 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:scale-110 text-slate-900 dark:text-white shadow-lg"
                >
                    <ChevronRight className="size-6" />
                </button>

                <div className="relative w-full h-full flex items-center justify-center perspective-1000">
                    {getVisibleCards().map(({ feature, position, key }) => {
                        const distance = Math.abs(position);
                        const depth = 1 - distance * 0.2;

                        return (
                            <motion.div
                                key={key} // Stable key based on virtual index
                                animate={{
                                    x: position * 320 * (1 - distance * 0.1), // Adjusted spacing
                                    y: Math.abs(position) * 20,
                                    scale: depth,
                                    opacity: distance > 1.5 ? 0 : 1 - distance * 0.3,
                                    filter: `blur(${distance * 4}px)`,
                                    zIndex: 20 - Math.abs(position),
                                }}
                                transition={{
                                    duration: 0.7,
                                    ease: [0.43, 0.13, 0.23, 0.96],
                                }}
                                className="absolute w-[320px] md:w-[350px]"
                            >
                                <FeatureCardContent feature={feature} isActive={position === 0} />
                            </motion.div>
                        );
                    })}
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {features.map((_, index) => (
                        <button key={index} onClick={() => setCurrentIndex(index)}>
                            <div
                                className={`size-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-emerald-500 w-6" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
