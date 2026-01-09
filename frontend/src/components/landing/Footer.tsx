import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Footer = () => {
    const navigate = useNavigate();

    const scrollToSection = (id: string) => {
        // If we are not on the landing page, navigate there first
        if (window.location.pathname !== "/") {
            navigate("/");
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                }
            }, 100);
        } else {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        }
    };

    return (
        <footer className="bg-slate-900 pt-20 3xl:pt-28 4xl:pt-36 pb-10 3xl:pb-14 4xl:pb-16 px-6 lg:px-8 3xl:px-16 4xl:px-24 border-t border-slate-800">
            <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2200px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 3xl:gap-16 4xl:gap-20 mb-16 3xl:mb-20 4xl:mb-24">
                    {/* Brand */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
                                A
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-white leading-none">AdmitFlow</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Admission Automation</span>
                            </div>
                        </div>
                        <p className="text-sm 3xl:text-base 4xl:text-lg text-slate-400 leading-relaxed">
                            Revolutionizing admission processes with AI-powered testing and evaluation. Making education accessible and fair for everyone.
                        </p>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition-colors cursor-pointer">
                                <Facebook className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition-colors cursor-pointer">
                                <Twitter className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition-colors cursor-pointer">
                                <Linkedin className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition-colors cursor-pointer">
                                <Instagram className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition-colors cursor-pointer">
                                <Youtube className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div id="about-footer">
                        <h4 className="text-white font-bold mb-6">Quick Links</h4>
                        <ul className="space-y-3 3xl:space-y-4 text-sm 3xl:text-base text-slate-400">
                            <li onClick={() => navigate("/about")} className="hover:text-emerald-500 cursor-pointer">About Us</li>
                            <li className="hover:text-emerald-500 cursor-pointer">Our Team</li>
                            <li className="hover:text-emerald-500 cursor-pointer">Careers</li>
                            <li className="hover:text-emerald-500 cursor-pointer">Press</li>
                            <li onClick={() => navigate("/blog")} className="hover:text-emerald-500 cursor-pointer">Blog</li>
                        </ul>
                    </div>

                    <div id="resources-footer">
                        <h4 className="text-white font-bold mb-6">Resources</h4>
                        <ul className="space-y-3 3xl:space-y-4 text-sm 3xl:text-base text-slate-400">
                            <li className="hover:text-emerald-500 cursor-pointer">Help Center</li>
                            <li className="hover:text-emerald-500 cursor-pointer">FAQs</li>
                            <li className="hover:text-emerald-500 cursor-pointer">Documentation</li>
                            <li className="hover:text-emerald-500 cursor-pointer">API Reference</li>
                            <li className="hover:text-emerald-500 cursor-pointer">Community</li>
                        </ul>
                    </div>

                    <div id="contact-footer">
                        <h4 className="text-white font-bold mb-6">Contact</h4>
                        <ul className="space-y-4 text-sm 3xl:text-base text-slate-400">
                            <li className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-emerald-500" />
                                support@admitflow.com
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-emerald-500" />
                                +1 (555) 123-4567
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-emerald-500 mt-1" />
                                <span>123 Education Street<br />San Francisco, CA 94102</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <div>© 2025 AdmitFlow. All rights reserved.</div>
                    <div className="flex gap-6">
                        <span className="hover:text-white cursor-pointer">Privacy Policy</span>
                        <span className="hover:text-white cursor-pointer">Terms of Service</span>
                        <span className="hover:text-white cursor-pointer">Cookie Policy</span>
                        <span className="hover:text-white cursor-pointer">Sitemap</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
