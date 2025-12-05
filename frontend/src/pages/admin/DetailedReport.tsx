import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DetailedReport = () => {
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        generateReport();
    }, []);

    const generateReport = async () => {
        try {
            const token = localStorage.getItem("firebase_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/admin/reports/generate-detailed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error("Failed to generate report");

            const data = await response.json();
            setReport(data.report);
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "Failed to generate detailed report",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!report) return;

        try {
            // Dynamically import to avoid SSR issues if any (though this is SPA)
            const jsPDF = (await import('jspdf')).default;
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(20);
            doc.text("Detailed AI Analysis", 20, 20);

            // Add date
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

            // Add content
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(report.replace(/\*\*/g, '').replace(/###/g, ''), 170);
            doc.text(splitText, 20, 40);

            doc.save("detailed-ai-report.pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
        }
    };

    const formatReport = (text: string) => {
        if (!text) return null;

        // Clean the text similar to AINotesPage
        const cleaned = text
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\*/g, '')   // Remove italic markdown
            .replace(/###\s*/g, '') // Remove headers markers but keep text
            .replace(/##\s*/g, '')
            .replace(/#\s*/g, '');

        return cleaned.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <br key={index} />;

            // Check if it was likely a header (now just text) or list item
            const isList = trimmed.startsWith('- ');

            return (
                <p key={index} className={`mb-2 leading-relaxed ${isList ? 'pl-4' : ''}`}>
                    {trimmed}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate("/admin/reports")} className="hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Reports
                    </Button>
                </div>

                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Detailed AI Analysis</h1>
                    {report && (
                        <Button variant="outline" onClick={handleExportPDF} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/50 dark:hover:bg-emerald-900/20">
                            <Download className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    )}
                </div>

                <Card className="border-2 border-primary/20">
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-muted-foreground animate-pulse">Analyzing student data with AI...</p>
                            </div>
                        ) : (
                            <div className="prose dark:prose-invert max-w-none bg-muted/30 p-8 rounded-lg border border-border/50 font-sans">
                                {report ? formatReport(report) : "No report generated."}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DetailedReport;
