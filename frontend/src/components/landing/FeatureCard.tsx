import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useRef } from "react";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    desc: string;
    color: string;
    delay: number;
}

export const FeatureCard = ({ icon: Icon, title, desc, color, delay }: FeatureCardProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);

        rotateX.set(yPct * -20);
        rotateY.set(xPct * 20);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        rotateX.set(0);
        rotateY.set(0);
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className="relative h-full bg-card border border-border rounded-2xl p-8 group perspective-1000"
        >
            <div
                style={{ transform: "translateZ(75px)" }}
                className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}
            >
                <Icon className="w-6 h-6 text-white" />
            </div>

            <div style={{ transform: "translateZ(50px)" }}>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                    {desc}
                </p>
            </div>

            {/* Glare/Glow Effect */}
            <motion.div
                style={{
                    background: useMotionTemplate`radial-gradient(
            400px circle at ${mouseXSpring}px ${mouseYSpring}px,
            rgba(255,255,255,0.1),
            transparent 80%
          )`,
                }}
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            />
        </motion.div>
    );
};
