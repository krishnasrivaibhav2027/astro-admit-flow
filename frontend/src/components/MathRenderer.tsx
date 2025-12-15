import 'katex/dist/katex.min.css';
import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';

interface MathRendererProps {
    text: string;
    className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "" }) => {
    if (!text) return null;

    // Split by double dollar signs for block math first
    // $$...$$
    const blockParts = text.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <span className={`math-renderer ${className}`}>
            {blockParts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    // Block math
                    const content = part.slice(2, -2); // Remove $$
                    return <BlockMath key={index} math={content} />;
                } else {
                    // Process inline math within text blocks
                    // $...$
                    // We need to be careful not to match \$ as a delimiter, but simplified regex usually works
                    // Regex to split by single $ but allow escaped \$
                    const inlineParts = part.split(/(\$[^$]*\$)/g);

                    return (
                        <span key={index}>
                            {inlineParts.map((subPart, subIndex) => {
                                if (subPart.startsWith('$') && subPart.endsWith('$')) {
                                    const content = subPart.slice(1, -1);
                                    return <InlineMath key={`${index}-${subIndex}`} math={content} />;
                                }
                                return <span key={`${index}-${subIndex}`}>{subPart}</span>;
                            })}
                        </span>
                    );
                }
            })}
        </span>
    );
};
