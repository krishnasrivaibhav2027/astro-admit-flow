import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

const steps = [
    { step: "01", title: "Register", desc: "Create your profile in minutes", color: "bg-emerald-500" },
    { step: "02", title: "Test", desc: "Answer AI-generated questions", color: "bg-blue-500" },
    { step: "03", title: "Progress", desc: "Advance through difficulty levels", color: "bg-purple-500" },
    { step: "04", title: "Results", desc: "Get detailed performance report", color: "bg-orange-500" }
];

export const HowItWorks = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 85%", "center 55%"]
    });

    return (
        <section id="how-it-works" className="py-32 overflow-hidden" ref={containerRef}>
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-24">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        How It <span className="text-emerald-500">Works</span>
                    </h2>
                    <p className="text-muted-foreground">Get started in 4 simple steps</p>
                </div>

                <div className="relative h-[400px] flex items-center justify-center">
                    {steps.map((item, idx) => {
                        // Calculate spread for each card
                        // We want them to start at center (0) and move to their relative positions
                        // Total width approx 1000px? Let's use percentages or fixed values.
                        // Let's say final positions are -450, -150, 150, 450 (centered around 0)

                        const finalX = (idx - 1.5) * 320; // 320px spacing
                        const x = useTransform(scrollYProgress, [0, 1], [0, finalX]);

                        // Add some rotation for the "fan" effect
                        const finalRotate = 0;
                        const initialRotate = (idx - 1.5) * 10; // -15, -5, 5, 15 degrees
                        const rotate = useTransform(scrollYProgress, [0, 1], [initialRotate, finalRotate]);

                        // Scale effect
                        const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);

                        // Opacity - fade in as they spread
                        const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

                        return (
                            <motion.div
                                key={idx}
                                style={{
                                    x,
                                    rotate,
                                    scale,
                                    opacity,
                                    zIndex: steps.length - idx, // Stack order
                                    position: "absolute",
                                    left: "50%",
                                    marginLeft: "-140px", // Half of card width (280px)
                                }}
                                className="w-[280px] h-[320px] bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                            >
                                <div>
                                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-lg`}>
                                        {item.step}
                                    </div>
                                    <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                                </div>

                                {idx < 3 && (
                                    <motion.div
                                        style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
                                        className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:block"
                                    >
                                        <ArrowRight className="w-8 h-8 text-muted-foreground/30" />
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
