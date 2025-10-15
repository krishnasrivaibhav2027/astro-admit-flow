import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Brain, Trophy, Sparkles } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Admission Test</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Welcome to <span className="gradient-text">AdmitAI</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Experience the future of academic assessment with our intelligent, adaptive testing system
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate("/registration")}
              className="text-lg group"
            >
              Start Your Journey
              <GraduationCap className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-24">
          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-2 animate-scale-in">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 group-hover:animate-glow-pulse">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Adaptive Testing</h3>
            <p className="text-muted-foreground">
              AI-generated questions tailored to your level, ensuring fair and accurate assessment
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-secondary/50 transition-all hover:shadow-xl hover:-translate-y-2 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary-glow flex items-center justify-center mb-4 group-hover:animate-glow-pulse">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Progressive Levels</h3>
            <p className="text-muted-foreground">
              Move through Easy, Medium, and Hard stages based on your performance
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-card border border-border hover:border-accent/50 transition-all hover:shadow-xl hover:-translate-y-2 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center mb-4 group-hover:animate-glow-pulse">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Evaluation</h3>
            <p className="text-muted-foreground">
              Get comprehensive feedback with detailed scoring across multiple criteria
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mt-32 text-center space-y-12">
          <h2 className="text-4xl font-bold">
            How It <span className="gradient-text">Works</span>
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Register", desc: "Create your profile" },
              { step: "02", title: "Test", desc: "Answer AI questions" },
              { step: "03", title: "Progress", desc: "Advance through levels" },
              { step: "04", title: "Results", desc: "Get your score" }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary to-secondary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
