import { Footer } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Award, CheckCircle, Eye, Globe, Heart, Lightbulb, Puzzle, Rocket, Scale, Shield, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const values = [
    { icon: Zap, title: "Innovation First", description: "Leveraging cutting-edge AI technology to revolutionize academic assessments.", color: "#10b981" },
    { icon: Shield, title: "Trust & Security", description: "Maintaining the highest standards of data protection and assessment integrity.", color: "#3b82f6" },
    { icon: Heart, title: "Student Success", description: "Dedicated to empowering every student to reach their full potential.", color: "#ec4899" },
    { icon: Globe, title: "Global Reach", description: "Making quality assessment accessible to institutions worldwide.", color: "#a855f7" },
];

const features = [
    { icon: Rocket, title: "AI-Powered Engine", description: "Advanced algorithms that adapt to each student's unique learning journey." },
    { icon: TrendingUp, title: "Real-Time Analytics", description: "Comprehensive insights that help students and institutions track progress." },
    { icon: Award, title: "Instant Feedback", description: "Detailed performance reports delivered immediately after completion." },
    { icon: Users, title: "Scalable Platform", description: "Supporting institutions from small schools to large universities." },
];

const stats = [
    { label: "Active Students", value: "10,000+", icon: Users },
    { label: "Partner Institutions", value: "500+", icon: Globe },
    { label: "Success Rate", value: "95%", icon: TrendingUp },
    { label: "Countries Served", value: "50+", icon: Globe },
];

const team = [
    { name: "Dr. Sarah Johnson", role: "Chief Technology Officer", expertise: "AI & Machine Learning", color: "#10b981" },
    { name: "Michael Chen", role: "Head of Product", expertise: "Educational Technology", color: "#3b82f6" },
    { name: "Emily Rodriguez", role: "Lead Data Scientist", expertise: "Assessment Analytics", color: "#a855f7" },
    { name: "David Park", role: "Director of Engineering", expertise: "Platform Architecture", color: "#f59e0b" },
];

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <LandingHeader />
            {/* Hero Section */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
                            <Sparkles className="size-4 text-emerald-500" />
                            <span className="text-emerald-500 text-sm">About AdmitFlow</span>
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">Transforming Academic <span className="text-emerald-500">Assessment</span></h1>
                        <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">AdmitFlow is an intelligent, AI-powered assessment platform designed to revolutionize how institutions evaluate and support student learning worldwide.</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
                        {stats.map((stat, index) => (
                            <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + index * 0.1 }} whileHover={{ y: -5 }} className="bg-card rounded-2xl p-6 border border-border text-center hover:border-emerald-500/30 transition-colors shadow-sm">
                                <stat.icon className="size-8 text-emerald-500 mx-auto mb-3" />
                                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                                <div className="text-muted-foreground text-sm">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Origin Story Section */}
            <section className="py-20 bg-muted/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <div className="inline-flex items-center gap-2 text-emerald-500 mb-4 font-medium">
                                <Lightbulb className="size-5" />
                                <span>The Origin</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">It Started With a Simple Observation</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    Traditional exams were failing students. We noticed that one-size-fits-all testing didn't capture potential; it often only measured memory or test-taking strategies.
                                </p>
                                <p>
                                    We saw brilliant minds struggling not because they didn't know the material, but because the assessment method was flawed, rigid, and anxiety-inducing. We asked ourselves: <span className="text-foreground italic">"What if a test could learn from the student as they took it?"</span>
                                </p>
                                <p>
                                    That question sparked the creation of AdmitFlow. We set out to build a system that adapts to each individual, finding their true level of understanding rather than just marking them right or wrong.
                                </p>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                            <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-red-500 font-bold">X</span>
                                    </div>
                                    <div>
                                        <h4 className="text-foreground font-medium mb-1">The Old Way</h4>
                                        <p className="text-sm text-muted-foreground">Static, linear, stressful. Measures memory, not understanding.</p>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-border ml-5 mb-6" />
                                <div className="flex items-start gap-4">
                                    <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="size-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-foreground font-medium mb-1">The AdmitFlow Way</h4>
                                        <p className="text-sm text-muted-foreground">Adaptive, dynamic, supportive. Measures true potential and growth.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Challenges Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Overcoming the <span className="text-emerald-500">Impossible</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">Building a fair, adaptive system presented a unique set of challenges.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-8 border border-border hover:border-blue-500/50 transition-colors group shadow-sm">
                            <div className="size-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Scale className="size-7 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">The Scale Trilemma</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                How do you test thousands simultaneously while ensuring no cheating, and still getting deep, meaningful insights? Early prototypes were too slow or too strict.
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-8 border border-border hover:border-pink-500/50 transition-colors group shadow-sm">
                            <div className="size-14 bg-pink-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Puzzle className="size-7 text-pink-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">The Complexity of Minds</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Human intelligence isn't linear. Mapping the multi-dimensional nature of student knowledge into code required inventing entirely new data models.
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-8 border border-border hover:border-emerald-500/50 transition-colors group shadow-sm">
                            <div className="size-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="size-7 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">The Solution</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                The breakthrough came with our dual-engine AI. One engine generates context-aware questions in real-time, while the other monitors integrity with privacy-preserving analysis.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Mission & Vision Section */}
            <section className="py-20 bg-muted/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12">
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-card rounded-2xl p-8 border border-border shadow-sm">
                            <div className="size-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6"><Target className="size-7 text-emerald-500" /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We're not just building software; we're building a level playing field. Our mission is to ensure that every student, regardless of their background or location, has access to a world-class assessment that truly understands their capabilities. We empower educational institutions with tools that drive academic success.
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-card rounded-2xl p-8 border border-border shadow-sm">
                            <div className="size-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6"><Eye className="size-7 text-blue-500" /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                To become the global standard for AI-powered academic assessment, making personalized, adaptive testing accessible to every institution and student worldwide. We envision a future where assessments are seen as a tool for growth, not a barrier to entry.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Core Values Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-4">Our <span className="text-emerald-500">Core Values</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">The principles that guide everything we do</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((value, index) => (
                            <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -8 }} className="bg-card rounded-2xl p-6 border border-border hover:border-foreground/20 transition-colors shadow-sm">
                                <div className="size-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${value.color}20` }}>
                                    <value.icon className="size-6" style={{ color: value.color }} />
                                </div>
                                <h3 className="text-foreground font-bold mb-3">{value.title}</h3>
                                <p className="text-muted-foreground text-sm">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-muted/50">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-4">Platform <span className="text-emerald-500">Features</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">Built with cutting-edge technology to deliver exceptional results</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl p-6 border border-border flex gap-4 hover:border-emerald-500/30 transition-colors shadow-sm">
                                <div className="size-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <feature.icon className="size-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-bold mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our <span className="text-emerald-500">Team</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">Expert leaders dedicated to transforming education</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {team.map((member, index) => (
                            <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -8 }} className="bg-card rounded-2xl p-6 border border-border text-center hover:border-foreground/20 transition-colors shadow-sm">
                                <div className="size-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-white font-bold" style={{ backgroundColor: member.color }}>
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h3 className="text-foreground font-bold mb-1">{member.name}</h3>
                                <div className="text-emerald-500 text-sm mb-2">{member.role}</div>
                                <div className="text-muted-foreground text-xs">{member.expertise}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-emerald-500/20 to-blue-500/20">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
                        <p className="text-muted-foreground mb-8 text-lg">Join thousands of students and hundreds of institutions already using AdmitFlow</p>
                        <Button
                            onClick={() => navigate("/registration")}
                            className="px-8 py-6 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors inline-flex items-center gap-2 text-lg font-semibold shadow-lg shadow-emerald-500/20 border-none dark:bg-none"
                        >
                            Start Your Journey <CheckCircle className="size-5" />
                        </Button>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div >
    );
};

export default About;
