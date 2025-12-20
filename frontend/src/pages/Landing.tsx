import { Footer } from "@/components/landing/Footer";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ParallaxCarousel } from "@/components/landing/ParallaxCarousel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Check,
  Clock,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check for hash parameters from Supabase email confirmation
    const hash = window.location.hash;
    if (hash && hash.includes("type=signup")) {
      toast({
        title: "Email Verified Successfully!",
        description: "Your account has been confirmed. Please login to continue.",
        duration: 5000,
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
      // Clear the hash to prevent toast from showing on refresh
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Bar */}
      <div className="bg-emerald-600 text-white py-2 px-4 text-xs md:text-sm hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure & Certified</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 24/7 Support</span>
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 10,000+ Students</span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-emerald-100 transition-colors">
            <span>Contact Us</span>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-mesh-matrix opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                AI-Powered Admission Test
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Welcome to <br />
                <span className="text-emerald-500">AdmitFlow</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Experience the future of academic assessment with our intelligent, adaptive testing system designed for institutions worldwide.
              </p>

              <div className="space-y-3 max-w-md mx-auto lg:mx-0">
                {[
                  "AI-Powered Question Generation",
                  "Real-time Performance Tracking",
                  "Instant Detailed Feedback"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 h-12 px-8 text-base border-none dark:bg-none"
                  onClick={() => navigate("/registration")}
                >
                  Start Your Journey <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:text-emerald-500 dark:hover:bg-emerald-500 dark:hover:text-white"
                >
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Right Content - Stats Card */}
            <div className="relative lg:pl-10">
              {/* Main Card */}
              <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-emerald-900/5 relative z-10">
                <div className="flex items-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">4.9/5 Rating</span>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <div className="text-3xl font-bold text-emerald-500 mb-1">10K+</div>
                    <div className="text-sm text-muted-foreground">Active Students</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-500 mb-1">500+</div>
                    <div className="text-sm text-muted-foreground">Institutions</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-500 mb-1">95%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-500 mb-1">24/7</div>
                    <div className="text-sm text-muted-foreground">AI Support</div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
                  <Shield className="w-6 h-6 text-emerald-500 mb-2" />
                  <span className="text-xs font-medium">Secure</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
                  <Check className="w-6 h-6 text-emerald-500 mb-2" />
                  <span className="text-xs font-medium">Certified</span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-emerald-500 mb-2" />
                  <span className="text-xs font-medium">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-muted-foreground">Everything you need for modern admission testing</p>
          </div>

          <div className="mt-8">
            <ParallaxCarousel />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
