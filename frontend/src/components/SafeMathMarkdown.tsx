import 'katex/dist/katex.min.css';
// Import mhchem extension for chemistry equations
import 'katex/dist/contrib/mhchem.min.js';
import React, { useState } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface SafeMathMarkdownProps {
    content: string;
}

// Custom image component with animated loading state and error handling
const ImageRenderer: React.FC<{ src?: string; alt?: string }> = ({ src, alt }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Simulate loading progress for visual feedback
    React.useEffect(() => {
        if (!loaded && !error) {
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 200);
            return () => clearInterval(interval);
        }
    }, [loaded, error]);

    if (!src) return null;

    if (error) {
        return (
            <div className="my-4 p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Image could not be loaded</p>
                {alt && <p className="text-xs text-slate-400 mt-1">{alt}</p>}
            </div>
        );
    }

    return (
        <figure className="my-4 relative">
            {/* Animated Loading State */}
            {!loaded && (
                <div className="w-full aspect-video bg-gradient-to-br from-emerald-100 via-blue-100 to-purple-100 dark:from-emerald-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-xl overflow-hidden relative">
                    {/* Animated gradient background */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10 animate-shimmer"
                        style={{
                            animation: 'shimmer 2s infinite',
                            backgroundSize: '200% 100%',
                        }}
                    />

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Animated icon */}
                        <div className="relative">
                            {/* Pulsing ring */}
                            <div className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />

                            {/* Main icon container */}
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                {/* Sparkle icon with rotation */}
                                <svg
                                    className="w-10 h-10 text-white animate-spin"
                                    style={{ animationDuration: '3s' }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"
                                    />
                                </svg>
                            </div>

                            {/* Orbiting dots */}
                            <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '2s' }}>
                                <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 bg-emerald-400 rounded-full" />
                            </div>
                            <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                                <div className="absolute bottom-0 left-1/2 w-2 h-2 -ml-1 bg-blue-400 rounded-full" />
                            </div>
                        </div>

                        {/* Text */}
                        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                            ✨ Generating illustration...
                        </p>

                        {/* Progress bar */}
                        <div className="mt-3 w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${loadingProgress}%` }}
                            />
                        </div>

                        {alt && (
                            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs text-center">
                                {alt}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Actual image */}
            <img
                src={src}
                alt={alt || 'AI generated illustration'}
                onLoad={() => {
                    setLoadingProgress(100);
                    setTimeout(() => setLoaded(true), 200);
                }}
                onError={() => setError(true)}
                className={`max-w-full h-auto rounded-xl shadow-lg transition-all duration-500 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
                    }`}
            />

            {/* Caption */}
            {alt && loaded && (
                <figcaption className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3 italic">
                    {alt}
                </figcaption>
            )}
        </figure>
    );
};

// Pre-process content to handle chemistry notation like \ce{...}
const preprocessChemistry = (content: string): string => {
    // Convert \ce{...} to proper LaTeX format if not already in math mode
    // This handles cases where \ce is used outside of $ delimiters
    return content
        // Handle standalone \ce{...} by wrapping in inline math
        .replace(/(?<!\$)\\ce\{([^}]+)\}(?!\$)/g, '$\\ce{$1}$')
        // Handle common chemistry arrows
        .replace(/->>/g, '\\longrightarrow')
        .replace(/<->/g, '\\leftrightarrow')
        .replace(/<=/g, '\\leftarrow');
};

// Pre-process physics notation
const preprocessPhysics = (content: string): string => {
    return content
        // Handle vectors with arrow notation
        .replace(/\\vec\{([^}]+)\}/g, '\\overrightarrow{$1}')
        // Handle common physics units
        .replace(/(\d+)\s*m\/s/g, '$1\\ \\text{m/s}')
        .replace(/(\d+)\s*kg/g, '$1\\ \\text{kg}')
        .replace(/(\d+)\s*N/g, '$1\\ \\text{N}')
        .replace(/(\d+)\s*J/g, '$1\\ \\text{J}')
        .replace(/(\d+)\s*W/g, '$1\\ \\text{W}');
};

const SafeMathMarkdown: React.FC<SafeMathMarkdownProps> = ({ content }) => {
    // Pre-process content for chemistry and physics
    let processedContent = preprocessChemistry(content);
    processedContent = preprocessPhysics(processedContent);

    // Split by block math $$...$$
    const parts = processedContent.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <div className="prose prose-slate dark:prose-invert max-w-none">
            {parts.map((part, i) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    // Block Math (including chemistry equations)
                    const math = part.slice(2, -2).trim();
                    return (
                        <div key={i} className="my-4 flex justify-center overflow-x-auto">
                            <BlockMath
                                errorColor={'#cc0000'}
                                renderError={(error) => (
                                    <span className="text-red-500 text-sm">
                                        Math Error: {error.message}
                                    </span>
                                )}
                            >
                                {math}
                            </BlockMath>
                        </div>
                    );
                }

                // Inline Math Splitting within the text part
                const inlineParts = part.split(/(\$[^\$\n]+?\$)/g);

                return (
                    <span key={i}>
                        {inlineParts.map((subPart, j) => {
                            if (subPart.startsWith('$') && subPart.endsWith('$') && subPart.length > 2) {
                                // Inline Math (including chemistry)
                                const math = subPart.slice(1, -1);
                                try {
                                    return (
                                        <InlineMath
                                            key={`${i}-${j}`}
                                            errorColor={'#cc0000'}
                                        >
                                            {math}
                                        </InlineMath>
                                    );
                                } catch (e) {
                                    // Fallback for parsing errors
                                    return <code key={`${i}-${j}`} className="text-red-500">{math}</code>;
                                }
                            } else {
                                // Markdown Text with image support
                                return (
                                    <span key={`${i}-${j}`} className="react-markdown-node">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                // Custom link renderer
                                                a: ({ node, ...props }) => (
                                                    <a
                                                        {...props}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-emerald-500 underline hover:text-emerald-600 dark:text-emerald-400"
                                                    />
                                                ),
                                                // Custom image renderer with loading states
                                                img: ({ node, src, alt, ...props }) => (
                                                    <ImageRenderer src={src} alt={alt} />
                                                ),
                                                // Custom code block styling
                                                code: ({ node, className, children, ...props }) => {
                                                    const isInline = !className && typeof children === 'string' && !children.includes('\n');
                                                    if (isInline) {
                                                        return (
                                                            <code
                                                                className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-600 dark:text-emerald-400"
                                                                {...props}
                                                            >
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                    return (
                                                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto my-4">
                                                            <code className={`font-mono text-sm ${className}`} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    );
                                                },
                                                // Chemistry-specific block rendering
                                                p: ({ node, children, ...props }) => (
                                                    <p className="my-2 leading-relaxed" {...props}>{children}</p>
                                                ),
                                                // Table styling
                                                table: ({ node, ...props }) => (
                                                    <div className="overflow-x-auto my-4">
                                                        <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-700" {...props} />
                                                    </div>
                                                ),
                                                th: ({ node, ...props }) => (
                                                    <th className="border border-slate-300 dark:border-slate-700 px-4 py-2 bg-slate-100 dark:bg-slate-800 font-semibold" {...props} />
                                                ),
                                                td: ({ node, ...props }) => (
                                                    <td className="border border-slate-300 dark:border-slate-700 px-4 py-2" {...props} />
                                                ),
                                                // List styling
                                                ul: ({ node, ...props }) => (
                                                    <ul className="list-disc list-inside my-2 space-y-1" {...props} />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
                                                ),
                                                // Blockquote styling for important notes
                                                blockquote: ({ node, ...props }) => (
                                                    <blockquote
                                                        className="border-l-4 border-emerald-500 pl-4 my-4 italic text-slate-600 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-r"
                                                        {...props}
                                                    />
                                                ),
                                            }}
                                        >
                                            {subPart}
                                        </ReactMarkdown>
                                    </span>
                                );
                            }
                        })}
                    </span>
                );
            })}
        </div>
    );
};

export default React.memo(SafeMathMarkdown);
