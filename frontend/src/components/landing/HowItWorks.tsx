import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Award, Brain, TrendingUp, UserPlus } from "lucide-react";
import { useRef } from "react";

const steps = [
    {
        step: "01",
        title: "Register",
        desc: "Create your profile in minutes with our streamlined onboarding process",
        color: "from-emerald-400 to-emerald-600",
        bgGlow: "bg-emerald-500/20",
        icon: UserPlus
    },
    {
        step: "02",
        title: "Test",
        desc: "Answer AI-powered questions tailored to your skill level",
        color: "from-blue-400 to-blue-600",
        bgGlow: "bg-blue-500/20",
        icon: Brain
    },
    {
        step: "03",
        title: "Progress",
        desc: "Advance through adaptive difficulty levels designed for growth",
        color: "from-purple-400 to-violet-600",
        bgGlow: "bg-purple-500/20",
        icon: TrendingUp
    },
    {
        step: "04",
        title: "Results",
        desc: "Receive comprehensive performance analytics and insights",
        color: "from-orange-400 to-rose-500",
        bgGlow: "bg-orange-500/20",
        icon: Award
    }
];

export const HowItWorks = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 85%", "center 55%"]
    });

    return (
        <section id="how-it-works" className="py-32 3xl:py-48 4xl:py-56 overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background" ref={containerRef}>
            <div className="container mx-auto px-4 3xl:max-w-[1800px] 4xl:max-w-[2400px]">
                {/* Header with enhanced styling */}
                <div className="text-center max-w-2xl 3xl:max-w-3xl 4xl:max-w-4xl mx-auto mb-24 3xl:mb-32 4xl:mb-40">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6 border border-emerald-500/20">
                            Simple Process
                        </span>
                        <h2 className="text-3xl md:text-4xl 3xl:text-5xl 4xl:text-6xl font-bold mb-4 3xl:mb-6 4xl:mb-8">
                            How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Works</span>
                        </h2>
                        <p className="text-muted-foreground 3xl:text-lg 4xl:text-xl max-w-lg mx-auto">
                            Get started in 4 simple steps and unlock your potential
                        </p>
                    </motion.div>
                </div>

                <div className="relative h-[450px] 3xl:h-[550px] 4xl:h-[650px] flex items-center justify-center">
                    {steps.map((item, idx) => {
                        const finalX = (idx - 1.5) * 380;
                        const x = useTransform(scrollYProgress, [0, 1], [0, finalX]);
                        const finalRotate = 0;
                        const initialRotate = (idx - 1.5) * 10;
                        const rotate = useTransform(scrollYProgress, [0, 1], [initialRotate, finalRotate]);
                        const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
                        const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
                        const Icon = item.icon;

                        return (
                            <motion.div
                                key={idx}
                                style={{
                                    x,
                                    rotate,
                                    scale,
                                    opacity,
                                    zIndex: steps.length - idx,
                                    position: "absolute",
                                    left: "50%",
                                    marginLeft: "-150px",
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    zIndex: 100,
                                    transition: { duration: 0.2 }
                                }}
                                className="group w-[300px] h-[360px] 3xl:w-[360px] 3xl:h-[420px] 4xl:w-[420px] 4xl:h-[480px] cursor-pointer"
                            >
                                {/* Card Container */}
                                <div className={`relative h-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-7 3xl:p-9 4xl:p-11 flex flex-col shadow-2xl shadow-black/5 dark:shadow-black/20 transition-all duration-300 group-hover:border-emerald-500/30 group-hover:shadow-emerald-500/10 overflow-hidden`}>

                                    {/* Gradient Glow Background */}
                                    <div className={`absolute -top-20 -right-20 w-40 h-40 ${item.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                    {/* Top Section */}
                                    <div className="relative z-10 flex-1">
                                        {/* Step Number Badge with Gradient */}
                                        <div className={`relative w-14 h-14 3xl:w-18 3xl:h-18 4xl:w-22 4xl:h-22 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mb-6 3xl:mb-8 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                                            <span className="text-white font-bold text-lg 3xl:text-xl 4xl:text-2xl">{item.step}</span>
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
                                        </div>

                                        {/* Icon floating */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                                            <Icon className="w-6 h-6 text-muted-foreground/50" />
                                        </div>

                                        {/* Title with underline effect */}
                                        <h4 className="text-xl 3xl:text-2xl 4xl:text-3xl font-bold mb-3 3xl:mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                                            {item.title}
                                        </h4>

                                        {/* Description */}
                                        <p className="text-muted-foreground 3xl:text-lg 4xl:text-xl leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>

                                    {/* Bottom Section - Learn More */}
                                    <div className="relative z-10 mt-6 pt-5 border-t border-border/50">
                                        <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 -translate-x-2">
                                            <span>Learn more</span>
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>

                                    {/* Bottom accent line */}
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-3xl`} />
                                </div>

                                {/* Arrow between cards */}
                                {idx < 3 && (
                                    <motion.div
                                        style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
                                        className="absolute -right-10 top-1/2 -translate-y-1/2 hidden lg:block"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                                            <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    className="text-center mt-16 3xl:mt-24"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                >
                    <p className="text-muted-foreground mb-4">Ready to begin your journey?</p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105">
                        Get Started Now
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.div>
            </div>
        </section>
    );
};
