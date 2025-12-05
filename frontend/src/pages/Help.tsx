import { Footer } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
    Book,
    CheckCircle,
    ChevronDown,
    FileText,
    HelpCircle,
    Lightbulb,
    MessageSquare,
    PlayCircle,
    Rocket,
    Search,
    TrendingUp,
    Users,
    Video,
    X,
    Zap
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Article {
    title: string;
    icon: any;
    category: string;
    readTime: string;
    content: string;
}

const popularArticles: Article[] = [
    {
        title: "Getting Started with AdmitFlow",
        icon: Rocket,
        category: "Getting Started",
        readTime: "5 min",
        content: `
            <h2>Welcome to AdmitFlow!</h2>
            <p>This comprehensive guide will help you get started with AdmitFlow's AI-powered assessment platform in just a few minutes.</p>
            
            <h3>Step 1: Create Your Account</h3>
            <p>Visit the registration page and choose your role (Student or Admin). Fill in your details and verify your email address. You'll receive a confirmation email within minutes.</p>
            
            <h3>Step 2: Complete Your Profile</h3>
            <p>Once logged in, complete your profile with relevant information. This helps our AI customize your experience and provide better recommendations.</p>
            
            <h3>Step 3: Explore the Dashboard</h3>
            <p>Familiarize yourself with the main dashboard. Students can see available tests and their progress, while admins have access to monitoring and analytics tools.</p>
            
            <h3>Step 4: Take Your First Test (Students)</h3>
            <p>Navigate to the Levels page, select your desired difficulty, and start your first adaptive test. The AI will adjust questions based on your performance in real-time.</p>
            
            <h3>Step 5: Set Up Your First Test (Admins)</h3>
            <p>Use the Question Analytics section to create question banks, set difficulty levels, and schedule tests for your students.</p>
            
            <blockquote>Pro Tip: Take a few minutes to explore all features before diving in. The interface is intuitive and designed for efficiency.</blockquote>
        `
    },
    {
        title: "Understanding AI-Adaptive Testing",
        icon: Zap,
        category: "Features",
        readTime: "8 min",
        content: `
            <h2>How AI-Adaptive Testing Works</h2>
            <p>AdmitFlow uses sophisticated AI algorithms to create a personalized testing experience that adapts to each student's unique learning curve.</p>
            
            <h3>The Science Behind Adaptive Testing</h3>
            <p>Traditional tests present the same questions to all students, regardless of their skill level. Our AI engine analyzes response patterns, time taken, and accuracy to dynamically adjust difficulty.</p>
            
            <h3>Real-Time Difficulty Adjustment</h3>
            <p>As you answer questions, our AI determines your current competency level. If you're answering correctly, questions become more challenging. If you're struggling, the system provides questions at an appropriate difficulty to build confidence.</p>
            
            <h3>Benefits of Adaptive Testing</h3>
            <ul>
                <li><strong>Accurate Assessment:</strong> Pinpoint your exact skill level with fewer questions</li>
                <li><strong>Reduced Test Anxiety:</strong> Questions match your ability, reducing frustration</li>
                <li><strong>Efficient Learning:</strong> Spend time on content that matters to your growth</li>
                <li><strong>Personalized Feedback:</strong> Get recommendations tailored to your needs</li>
            </ul>
            
            <h3>How It's Different</h3>
            <p>Unlike static tests, adaptive testing provides a unique experience for each student while maintaining assessment validity and reliability.</p>
            
            <blockquote>Did you know? Studies show adaptive testing can reduce test time by up to 50% while maintaining the same accuracy as traditional tests.</blockquote>
        `
    },
    {
        title: "How to Interpret Your Results",
        icon: TrendingUp,
        category: "For Students",
        readTime: "6 min",
        content: `
            <h2>Understanding Your Test Results</h2>
            <p>Your results dashboard provides comprehensive insights into your performance, growth, and areas for improvement.</p>
            
            <h3>Overall Score</h3>
            <p>Your score is displayed as a percentage and percentile rank. The percentile shows how you compare to other test-takers at your level.</p>
            
            <h3>Performance Breakdown</h3>
            <p>Results are categorized by topic and skill area, showing your strengths and weaknesses. This helps you focus your study efforts effectively.</p>
            
            <h3>Skill Level Assessment</h3>
            <p>The AI assigns you a skill level (Beginner, Intermediate, Advanced, Expert) based on your performance. This evolves as you take more tests.</p>
            
            <h3>Progress Tracking</h3>
            <p>View your performance trends over time with detailed graphs and charts. Track improvement in specific areas and celebrate your growth.</p>
            
            <h3>Personalized Recommendations</h3>
            <p>Based on your results, you'll receive AI-generated recommendations for topics to review, practice areas, and suggested difficulty levels for your next test.</p>
            
            <h3>Detailed Question Review</h3>
            <p>Access a complete review of all questions, including correct answers, explanations, and why certain options were incorrect.</p>
            
            <blockquote>Remember: Every test is a learning opportunity. Focus on understanding concepts, not just scores.</blockquote>
        `
    },
    {
        title: "Setting Up Your First Test",
        icon: PlayCircle,
        category: "Admin Guide",
        readTime: "10 min",
        content: `
            <h2>Admin Guide: Creating Your First Test</h2>
            <p>This step-by-step guide will walk you through creating and deploying your first adaptive test.</p>
            
            <h3>1. Access the Question Bank</h3>
            <p>Navigate to Question Analytics in your admin dashboard. This is where you'll manage all test content.</p>
            
            <h3>2. Create a Question Bank</h3>
            <p>Click "Create New Bank" and give it a descriptive name. Organize banks by subject, course, or assessment type.</p>
            
            <h3>3. Add Questions</h3>
            <p>You can manually add questions or bulk upload via CSV/JSON. Each question should include:</p>
            <ul>
                <li>Question text and type (multiple choice, true/false, etc.)</li>
                <li>Difficulty level (Easy, Medium, Hard)</li>
                <li>Topic and skill tags</li>
                <li>Correct answer(s) and explanations</li>
            </ul>
            
            <h3>4. Configure Test Settings</h3>
            <p>Set parameters like time limit, number of questions, passing score, and whether to allow retakes.</p>
            
            <h3>5. Assign to Students</h3>
            <p>Select student groups or individuals who should have access to the test. Set start and end dates if needed.</p>
            
            <h3>6. Enable Proctoring (Optional)</h3>
            <p>Configure integrity monitoring settings including webcam requirements, screen recording, and suspicious activity detection.</p>
            
            <h3>7. Launch and Monitor</h3>
            <p>Once published, monitor test-takers in real-time through the Live Monitoring dashboard.</p>
            
            <blockquote>Best Practice: Start with a pilot test for a small group before rolling out to all students.</blockquote>
        `
    },
    {
        title: "Managing Student Accounts",
        icon: Users,
        category: "Admin Guide",
        readTime: "7 min",
        content: `
            <h2>Student Account Management</h2>
            <p>Efficiently manage student accounts, permissions, and access through the Student Management panel.</p>
            
            <h3>Adding Students</h3>
            <p>Add students individually or import in bulk via CSV. Each student needs an email address and will receive account creation instructions.</p>
            
            <h3>Organizing Students</h3>
            <p>Create groups, classes, or cohorts to organize students. This makes it easier to assign tests and manage permissions at scale.</p>
            
            <h3>Setting Permissions</h3>
            <p>Control what students can access:</p>
            <ul>
                <li>Test availability and scheduling</li>
                <li>Results visibility</li>
                <li>Retake permissions</li>
                <li>Access to review materials</li>
            </ul>
            
            <h3>Monitoring Progress</h3>
            <p>Track individual and group performance through comprehensive dashboards. Identify students who need additional support.</p>
            
            <h3>Communication Tools</h3>
            <p>Send announcements, individual messages, or schedule meetings with students directly through the platform.</p>
            
            <h3>Account Status Management</h3>
            <p>Activate, deactivate, or delete student accounts as needed. Export student data for reporting or archival purposes.</p>
            
            <blockquote>Privacy Note: All student data is encrypted and handled in compliance with GDPR and FERPA regulations.</blockquote>
        `
    },
    {
        title: "Troubleshooting Common Issues",
        icon: HelpCircle,
        category: "Technical",
        readTime: "4 min",
        content: `
            <h2>Common Issues and Solutions</h2>
            <p>Quick fixes for the most frequently encountered technical issues.</p>
            
            <h3>Issue: Can't Log In</h3>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Reset your password using the "Forgot Password" link</li>
                <li>Clear your browser cache and cookies</li>
                <li>Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge)</li>
                <li>Check if your account email is verified</li>
            </ul>
            
            <h3>Issue: Test Won't Load</h3>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Check your internet connection (minimum 5 Mbps required)</li>
                <li>Disable browser extensions that might interfere</li>
                <li>Try a different browser</li>
                <li>Ensure JavaScript is enabled</li>
            </ul>
            
            <h3>Issue: Questions Not Displaying Correctly</h3>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Refresh the page</li>
                <li>Check if images/diagrams are blocked by firewall</li>
                <li>Update your browser to the latest version</li>
                <li>Try switching to a different device</li>
            </ul>
            
            <h3>Issue: Results Not Showing</h3>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Wait a few minutes - results typically process within 2 minutes</li>
                <li>Check if the test was fully submitted</li>
                <li>Contact your admin if results are delayed beyond 5 minutes</li>
            </ul>
            
            <h3>Still Having Issues?</h3>
            <p>Contact our support team at support@admitflow.com with:</p>
            <ul>
                <li>Your account email</li>
                <li>Browser and version</li>
                <li>Screenshot of the error (if applicable)</li>
                <li>Steps to reproduce the issue</li>
            </ul>
            
            <blockquote>Response Time: Our support team typically responds within 2 hours during business hours.</blockquote>
        `
    },
];

const faqCategories = [
    {
        id: "students",
        name: "For Students",
        icon: Users,
        faqs: [
            {
                q: "How does the AI adapt to my skill level?",
                a: "Our advanced AI engine continuously analyzes your responses, identifying patterns in your understanding. It dynamically adjusts question difficulty, ensuring you're consistently challenged at the optimal level for learning and assessment."
            },
            {
                q: "Can I retake a test if I'm not satisfied with my results?",
                a: "Yes! You can retake any test after a 24-hour cooldown period. Each attempt gives you fresh, adaptive questions calibrated to your current skill level, providing a fair and accurate assessment."
            },
            {
                q: "What happens if my internet disconnects during a test?",
                a: "Don't worry! AdmitFlow automatically saves your progress every 30 seconds. If you disconnect, you'll have a 5-minute grace period to reconnect and continue exactly where you left off."
            },
            {
                q: "How can I track my progress over time?",
                a: "Your profile dashboard features comprehensive analytics including performance trends, skill development graphs, and personalized recommendations for improvement based on your test history."
            }
        ]
    },
    {
        id: "admins",
        name: "For Admins",
        icon: Zap,
        faqs: [
            {
                q: "How do I create custom question banks?",
                a: "Navigate to the Question Analytics section, click 'Create New Bank', and upload questions in CSV or JSON format. You can organize by difficulty, topic, and skill area, with our AI auto-tagging questions for easier categorization."
            },
            {
                q: "Can I monitor tests in real-time?",
                a: "Absolutely! The Live Monitoring dashboard shows active test-takers, their progress, integrity metrics, and performance insights in real-time. You can even receive alerts for suspicious activity."
            },
            {
                q: "How do I manage student permissions and access?",
                a: "Use the Student Management panel to assign roles, set test schedules, grant or revoke access, and organize students into groups or cohorts for easier administration."
            },
            {
                q: "What reports can I generate?",
                a: "Generate comprehensive reports including individual performance, class analytics, question effectiveness, completion rates, and comparative analysis across different student groups or time periods."
            }
        ]
    },
    {
        id: "technical",
        name: "Technical",
        icon: HelpCircle,
        faqs: [
            {
                q: "What are the system requirements?",
                a: "AdmitFlow works on any modern device with a stable internet connection (minimum 5 Mbps). We recommend Chrome, Firefox, Safari, or Edge (latest versions). A webcam and microphone may be required for proctored tests."
            },
            {
                q: "Is my data secure and private?",
                a: "Yes! We use bank-level AES-256 encryption for data at rest and TLS 1.3 for data in transit. We're GDPR compliant, SOC 2 certified, and never share your data with third parties without explicit consent."
            },
            {
                q: "Can I integrate AdmitFlow with my LMS?",
                a: "We support LTI 1.3 integration with popular LMS platforms including Canvas, Blackboard, Moodle, and Google Classroom. SSO integration is also available for enterprise plans."
            },
            {
                q: "What accessibility features are available?",
                a: "AdmitFlow supports screen readers, keyboard navigation, adjustable text sizes, high contrast modes, and extended time accommodations. We're WCAG 2.1 AA compliant."
            }
        ]
    },
    {
        id: "billing",
        name: "Billing & Plans",
        icon: FileText,
        faqs: [
            {
                q: "What plans are available?",
                a: "We offer Free (for individual students), Pro ($29/month for educators), and Enterprise (custom pricing) plans. All plans include core AI features with varying limits on test volume and advanced analytics."
            },
            {
                q: "Can I upgrade or downgrade my plan?",
                a: "Yes! You can change plans anytime from your account settings. Upgrades take effect immediately, while downgrades apply at the start of your next billing cycle with prorated refunds."
            },
            {
                q: "Do you offer educational discounts?",
                a: "Absolutely! We provide 50% discounts for verified educational institutions, non-profits, and students. Contact our sales team to discuss volume pricing for schools and districts."
            },
            {
                q: "What's your refund policy?",
                a: "We offer a 30-day money-back guarantee for all paid plans, no questions asked. If you're not satisfied, contact support for a full refund within the first month."
            }
        ]
    }
];

const supportChannels = [
    {
        icon: MessageSquare,
        title: "Live Chat Support",
        description: "Get instant help from our team",
        availability: "24/7 Available",
        color: "emerald"
    },
    {
        icon: Video,
        title: "Video Tutorials",
        description: "Watch step-by-step guides",
        availability: "100+ Videos",
        color: "blue"
    },
    {
        icon: Book,
        title: "Documentation",
        description: "Comprehensive guides & API docs",
        availability: "Always Updated",
        color: "purple"
    },
    {
        icon: Users,
        title: "Community Forum",
        description: "Connect with other users",
        availability: "5000+ Members",
        color: "pink"
    }
];

export default function Help() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("students");
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    const activeFaqs = faqCategories.find(cat => cat.id === activeTab)?.faqs || [];

    // Search functionality
    const searchResults = searchQuery.trim() ? {
        articles: popularArticles.filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        faqs: faqCategories.flatMap(category =>
            category.faqs.filter(faq =>
                faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faq.a.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(faq => ({ ...faq, category: category.name }))
        )
    } : null;

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
            <LandingHeader />

            {/* Article Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedArticle(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <selectedArticle.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedArticle.title}</h2>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{selectedArticle.category}</span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-slate-500 dark:text-slate-400">{selectedArticle.readTime} read</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8">
                                <div
                                    className="prose prose-lg dark:prose-invert prose-emerald max-w-none
                                        prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
                                        prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4
                                        prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                                        prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                                        prose-ul:my-4 prose-li:text-slate-600 dark:prose-li:text-slate-300
                                        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                                        prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:my-6 prose-blockquote:italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300 prose-blockquote:bg-emerald-50 dark:prose-blockquote:bg-emerald-900/20 prose-blockquote:rounded-r-lg"
                                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <section className="pt-32 pb-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
                            <Lightbulb className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Help Center</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
                            How can we <span className="text-emerald-600">help</span> you today?
                        </h1>
                        <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
                            Find answers, explore guides, and get the support you need to succeed
                        </p>

                        {/* Enhanced Search */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="max-w-3xl mx-auto"
                        >
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search for help articles, guides, tutorials..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-900 dark:text-white text-lg shadow-xl transition-all"
                                />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                                Popular searches: <span onClick={() => setSearchQuery("Getting Started")} className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">Getting Started</span>, <span onClick={() => setSearchQuery("AI Testing")} className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">AI Testing</span>, <span onClick={() => setSearchQuery("Admin Panel")} className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">Admin Panel</span>
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Search Results */}
            {searchResults && (searchResults.articles.length > 0 || searchResults.faqs.length > 0) && (
                <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                            Search Results for "{searchQuery}"
                        </h2>

                        {/* Article Results */}
                        {searchResults.articles.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Articles ({searchResults.articles.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {searchResults.articles.map((article, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedArticle(article)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-lg transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <article.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {article.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-emerald-600 dark:text-emerald-400">{article.category}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-slate-500 dark:text-slate-400">{article.readTime}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FAQ Results */}
                        {searchResults.faqs.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">FAQs ({searchResults.faqs.length})</h3>
                                <div className="space-y-3">
                                    {searchResults.faqs.map((faq, index) => (
                                        <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">{faq.category}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{faq.a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Show no results message */}
            {searchResults && searchResults.articles.length === 0 && searchResults.faqs.length === 0 && (
                <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
                    <div className="max-w-7xl mx-auto px-6 text-center">
                        <HelpCircle className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No results found</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">Try different keywords or browse our help sections below</p>
                        <Button onClick={() => setSearchQuery("")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Clear Search
                        </Button>
                    </div>
                </section>
            )}

            {/* Only show these sections when not searching */}
            {!searchQuery && (
                <>
                    {/* Stats Section */}
                    <section className="py-12 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
                        <div className="max-w-7xl mx-auto px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {[
                                    { label: "Help Articles", value: "500+", icon: Book },
                                    { label: "Video Guides", value: "100+", icon: Video },
                                    { label: "Happy Users", value: "10K+", icon: Users },
                                    { label: "Avg Response Time", value: "< 2hrs", icon: MessageSquare }
                                ].map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="text-center"
                                    >
                                        <stat.icon className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Support Channels */}
                    <section className="py-20">
                        <div className="max-w-7xl mx-auto px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                                    Choose Your <span className="text-emerald-600">Support Channel</span>
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                                    Multiple ways to get the help you need, whenever you need it
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {supportChannels.map((channel, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        onClick={() => channel.title === "Live Chat Support" && navigate("/contact")}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 hover:shadow-xl transition-all cursor-pointer group"
                                    >
                                        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <channel.icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{channel.title}</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{channel.description}</p>
                                        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle className="w-4 h-4" />
                                            {channel.availability}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Popular Articles */}
                    <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
                        <div className="max-w-7xl mx-auto px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                                    Popular <span className="text-emerald-600">Help Articles</span>
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400">
                                    Most frequently accessed resources by our community
                                </p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {popularArticles.map((article, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ y: -5 }}
                                        onClick={() => setSelectedArticle(article)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:border-emerald-500/50 hover:shadow-lg transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <article.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {article.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{article.category}</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span className="text-slate-500 dark:text-slate-400">{article.readTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* FAQ Section with Tabs */}
                    <section className="py-20">
                        <div className="max-w-5xl mx-auto px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                                    Frequently Asked <span className="text-emerald-600">Questions</span>
                                </h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400">
                                    Quick answers to questions you may have
                                </p>
                            </motion.div>

                            {/* Category Tabs */}
                            <div className="flex flex-wrap gap-3 justify-center mb-10">
                                {faqCategories.map((category) => {
                                    const Icon = category.icon;
                                    return (
                                        <button
                                            key={category.id}
                                            onClick={() => setActiveTab(category.id)}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === category.id
                                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {category.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* FAQ List */}
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {activeFaqs.map((faq, index) => {
                                    const faqId = `${activeTab}-${index}`;
                                    const isExpanded = expandedFaq === faqId;

                                    return (
                                        <div
                                            key={index}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all"
                                        >
                                            <button
                                                onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                                                className="w-full flex items-start justify-between p-6 text-left group"
                                            >
                                                <span className="font-semibold text-lg text-slate-900 dark:text-white pr-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {faq.q}
                                                </span>
                                                <div className={`w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                                    <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                            </button>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="px-6 pb-6"
                                                >
                                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {faq.a}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-20 bg-gradient-to-r from-emerald-600 to-emerald-500">
                        <div className="max-w-4xl mx-auto px-6 text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="text-4xl font-bold text-white mb-4">
                                    Didn't Find What You're Looking For?
                                </h2>
                                <p className="text-xl text-emerald-100 mb-10">
                                    Our support team is here to help you every step of the way
                                </p>
                                <div className="flex gap-4 justify-center flex-wrap">
                                    <Button
                                        onClick={() => navigate("/contact")}
                                        className="px-8 py-6 bg-white hover:bg-slate-50 text-emerald-600 font-semibold rounded-xl transition-all shadow-xl text-lg"
                                    >
                                        <MessageSquare className="w-5 h-5 mr-2" />
                                        Contact Support
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="px-8 py-6 bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold rounded-xl transition-all text-lg"
                                    >
                                        <Book className="w-5 h-5 mr-2" />
                                        View All Guides
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                </>
            )}

            <Footer />
        </div>
    );
}
