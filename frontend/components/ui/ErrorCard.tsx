import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Stack,
    Grid,
    useTheme,
    alpha
} from '@mui/material';
import {
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon,
    Build as BuildIcon,
    Construction as ConstructionIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { SparePartsSearch } from './SparePartsSearch';

interface SparePart {
    oem_code: string;
    description: string;
    ranking: number;
    image_url?: string;
    [key: string]: unknown;
}

interface ErrorProps {
    error: {
        code: string;
        classification?: string;
        cause?: string;
        measures?: string;
        solution?: string;
        estimated_abnormal_parts?: string;
        correction?: string;
        faulty_part_isolation?: string;
        note?: string;
        parts?: SparePart[];
    };
    onDipSwitchClick?: (sw: number, bit: number) => void;
    model?: string;
}

export function ErrorCard({ error, onDipSwitchClick, model }: ErrorProps) {
    const theme = useTheme();
    const [partSearchOpen, setPartSearchOpen] = useState(false);
    const [partQuery, setPartQuery] = useState('');

    // Extract Model Name from props if available? 
    // Wait, ErrorCard receives 'error' object which has printer_id but maybe not model name directly?
    // The 'error' object in ErrorProps doesn't have model name.
    // However, the parent page knows the selected model.
    // Ideally we should pass model name to ErrorCard.
    // For now, let's assume we can get it or we need to update props.
    // Checking page.tsx: <ErrorCard key={err.id} error={err} ... />
    // The 'err' object from 'searchErrors' has 'printer: { model_name }' join? 
    // In handlers.rs: SELECT e.* FROM error_codes e JOIN printers p ...
    // But struct ErrorCode doesn't have printer model.
    // However, the user SELECTED the model in the dropdown in page.tsx.
    // We should pass 'model={selectedModel}' to ErrorCard.

    // TEMPORARY FIX: We need to update props to include model.
    // For this step, I'll update the component structure and Logic, then I'll update Page.tsx to pass model.

    // Helper for general text - only detects DipSwitches
    const renderLinkedText = (text: string | undefined, isPreWrap = false) => {
        if (!text) return null;

        const dipswRegex = /(?:DipSW|SW)\s*(\d+)-(\d+)/gi;
        const matches = [...text.matchAll(dipswRegex)];

        if (matches.length === 0) {
            return isPreWrap ? <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Box> : text;
        }

        const elements = [];
        let cursor = 0;

        for (const match of matches) {
            const [fullMatch, swStr, bitStr] = match;
            const index = match.index!;

            if (index > cursor) {
                elements.push(
                    <Box component="span" key={`txt-${index}`} sx={{ whiteSpace: isPreWrap ? 'pre-wrap' : 'normal' }}>
                        {text.slice(cursor, index)}
                    </Box>
                );
            }

            elements.push(
                <Chip
                    key={`link-${index}`}
                    size="small"
                    label={fullMatch}
                    icon={<SettingsIcon style={{ fontSize: 14 }} />}
                    color="secondary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDipSwitchClick?.(parseInt(swStr), parseInt(bitStr));
                    }}
                    sx={{
                        mx: 0.5,
                        height: 24,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: theme.palette.secondary.dark,
                        }
                    }}
                />
            );

            cursor = index + fullMatch.length;
        }

        if (cursor < text.length) {
            elements.push(
                <Box component="span" key={`txt-end`} sx={{ whiteSpace: isPreWrap ? 'pre-wrap' : 'normal' }}>
                    {text.slice(cursor)}
                </Box>
            );
        }

        return <>{elements}</>;
    };

    // Helper for spare parts section - detects DipSwitches AND part patterns
    const renderLinkedTextWithParts = (text: string | undefined, isPreWrap = false) => {
        if (!text) return null;

        // Define all patterns - ORDER MATTERS! More specific patterns first
        const patterns = [
            // 1. DipSW X-Y or SW X-Y
            {
                regex: /(?:DipSW|SW)\s*(\d+)-(\d+)/gi,
                type: 'dipswitch' as const,
                icon: <SettingsIcon style={{ fontSize: 14 }} />,
                color: 'secondary' as const
            },
            // 2. Part names WITH acronym in parentheses (e.g., "Printer control board (PRCB)", "Fan Motor (FM1)")
            // This must come BEFORE standalone acronym detection to avoid duplicates
            {
                regex: /((?:Fusing|Transfer|Drum|Developer|Charge|Cleaning|DC\s*power\s*supply|Printer\s*control|Paper\s*lift\s*motor|Upper\s*limit\s*sensor|Fan\s*motor|Motor|Clutch|Solenoid|Photo\s*sensor|Photointerrupter|Temperature\s*sensor|Thermostat|Switch)\s*(?:Unit|Roller|Assembly|Board|\/\d+)?\s*\([A-Z0-9]{2,6}\))/gi,
                type: 'partname_with_acronym' as const,
                icon: <BuildIcon style={{ fontSize: 14 }} />,
                color: 'success' as const
            },
            // 3. Part names WITHOUT acronym
            {
                regex: /((?:Fusing|Transfer|Drum|Developer|Charge|Cleaning|DC\s*power\s*supply|Printer\s*control|Paper\s*lift\s*motor|Upper\s*limit\s*sensor|Fan\s*motor|Motor|Clutch|Solenoid|Photo\s*sensor|Photointerrupter|Temperature\s*sensor|Thermostat|Switch)\s*(?:Unit|Roller|Assembly|Board|\/\d+)?)/gi,
                type: 'partname' as const,
                icon: <BuildIcon style={{ fontSize: 14 }} />,
                color: 'success' as const
            },
            // 4. Standalone acronyms (only if not already matched by compound pattern)
            {
                regex: /\b([A-Z]{2,6}\d*|[A-Z]+\d{1,3})\b/g,
                type: 'acronym' as const,
                icon: <BuildIcon style={{ fontSize: 14 }} />,
                color: 'success' as const
            },
            // 5. Alphanumeric part codes (8-12 chars)
            {
                regex: /\b([A-Z0-9]{8,12})\b/g,
                type: 'partcode' as const,
                icon: <BuildIcon style={{ fontSize: 14 }} />,
                color: 'success' as const
            }
        ];

        // Find all matches from all patterns
        const allMatches: Array<{
            index: number;
            length: number;
            text: string;
            type: string;
            icon: JSX.Element;
            color: 'secondary' | 'success';
            swNum?: number;
            bitNum?: number;
        }> = [];

        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern.regex)];
            for (const match of matches) {
                const index = match.index!;
                const fullMatch = match[0];

                // Skip if this overlaps with an existing match
                const overlaps = allMatches.some(m =>
                    (index >= m.index && index < m.index + m.length) ||
                    (index + fullMatch.length > m.index && index + fullMatch.length <= m.index + m.length)
                );

                if (!overlaps) {
                    if (pattern.type === 'dipswitch') {
                        allMatches.push({
                            index,
                            length: fullMatch.length,
                            text: fullMatch,
                            type: pattern.type,
                            icon: pattern.icon,
                            color: pattern.color,
                            swNum: parseInt(match[1]),
                            bitNum: parseInt(match[2])
                        });
                    } else {
                        allMatches.push({
                            index,
                            length: fullMatch.length,
                            text: fullMatch,
                            type: pattern.type,
                            icon: pattern.icon,
                            color: pattern.color
                        });
                    }
                }
            }
        }

        // Sort by index
        allMatches.sort((a, b) => a.index - b.index);

        if (allMatches.length === 0) {
            return isPreWrap ? <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Box> : text;
        }

        const elements = [];
        let cursor = 0;

        for (const match of allMatches) {
            // Text before match
            if (match.index > cursor) {
                elements.push(
                    <Box component="span" key={`txt-${match.index}`} sx={{ whiteSpace: isPreWrap ? 'pre-wrap' : 'normal' }}>
                        {text.slice(cursor, match.index)}
                    </Box>
                );
            }

            // The clickable chip
            if (match.type === 'dipswitch') {
                elements.push(
                    <Chip
                        key={`link-${match.index}`}
                        size="small"
                        label={match.text}
                        icon={match.icon}
                        color={match.color}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDipSwitchClick?.(match.swNum!, match.bitNum!);
                        }}
                        sx={{
                            mx: 0.5,
                            height: 24,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: theme.palette.secondary.dark,
                            }
                        }}
                    />
                );
            } else {
                // Part search (acronym, partname, or partcode)
                elements.push(
                    <Chip
                        key={`link-${match.index}`}
                        size="small"
                        label={match.text}
                        icon={match.icon}
                        color={match.color}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!model) {
                                alert('Please select a model first');
                                return;
                            }
                            setPartQuery(match.text);
                            setPartSearchOpen(true);
                        }}
                        sx={{
                            mx: 0.5,
                            height: 24,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: theme.palette.success.dark,
                            }
                        }}
                    />
                );
            }

            cursor = match.index + match.length;
        }

        // Text after last match
        if (cursor < text.length) {
            elements.push(
                <Box component="span" key={`txt-end`} sx={{ whiteSpace: isPreWrap ? 'pre-wrap' : 'normal' }}>
                    {text.slice(cursor)}
                </Box>
            );
        }

        return <>{elements}</>;
    };

    return (
        <Card
            elevation={4}
            sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[8],
                },
                border: `1px solid ${theme.palette.divider}`
            }}
        >
            <Box
                sx={{
                    p: 2,
                    px: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`
                }}
            >
                <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: -0.5 }}>
                    {error.code}
                </Typography>
                <Chip
                    label={error.classification || 'Error'}
                    color="primary"
                    variant="outlined"
                    sx={{
                        fontWeight: 'bold',
                        borderRadius: 2,
                        height: 32,
                        fontSize: '0.9rem'
                    }}
                />
            </Box>

            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack spacing={3}>
                    {error.cause && (
                        <Box display="flex" gap={2}>
                            <WarningIcon color="warning" sx={{ mt: 0.5 }} />
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" textTransform="uppercase" gutterBottom>
                                    Cause
                                </Typography>
                                <Typography variant="body1" color="text.primary" component="div">
                                    {renderLinkedText(error.cause)}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {error.measures && (
                        <Box display="flex" gap={2}>
                            <InfoIcon color="info" sx={{ mt: 0.5 }} />
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" textTransform="uppercase" gutterBottom>
                                    Measures
                                </Typography>
                                <Typography variant="body1" color="text.primary" component="div">
                                    {renderLinkedText(error.measures, true)}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {error.solution && (
                        <Box display="flex" gap={2}>
                            <CheckCircleIcon color="success" sx={{ mt: 0.5 }} />
                            <Box width="100%">
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" textTransform="uppercase" gutterBottom>
                                    Solution
                                </Typography>
                                <Box color="text.primary">
                                    {(() => {
                                        const hasNumbering = /\d+\./.test(error.solution || '');

                                        if (hasNumbering) {
                                            const steps = (error.solution || '')
                                                .split(/(?=\b\d+\.\s)/)
                                                .map(s => s.trim())
                                                .filter(s => s.length > 0);

                                            return (
                                                <Stack spacing={1} component="ol" sx={{ pl: 0, listStyle: 'none', m: 0 }}>
                                                    {steps.map((step, idx) => {
                                                        const match = step.match(/^(\d+\.)\s+([\s\S]*)/);
                                                        if (match) {
                                                            return (
                                                                <Box component="li" key={idx} display="flex" gap={1}>
                                                                    <Typography component="span" color="primary.main" fontWeight="bold" sx={{ minWidth: 24 }}>
                                                                        {match[1]}
                                                                    </Typography>
                                                                    <Typography component="div">
                                                                        {renderLinkedText(match[2])}
                                                                    </Typography>
                                                                </Box>
                                                            );
                                                        }
                                                        return <Box component="li" key={idx} sx={{ pl: 4 }}>{renderLinkedText(step)}</Box>;
                                                    })}
                                                </Stack>
                                            );
                                        }

                                        return (
                                            <Stack spacing={1} component="ul" sx={{ pl: 2, m: 0 }}>
                                                {(error.solution || '').split('\n').map((line, idx) => {
                                                    const trimmed = line.trim();
                                                    if (!trimmed) return null;
                                                    return <Box component="li" key={idx}>{renderLinkedText(trimmed)}</Box>;
                                                })}
                                            </Stack>
                                        );
                                    })()}
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {error.correction && (
                        <Box display="flex" gap={2}>
                            {error.correction.toLowerCase().includes('warning') ? (
                                <WarningIcon color="error" sx={{ mt: 0.5 }} />
                            ) : (
                                <CheckCircleIcon sx={{ color: 'text.secondary', mt: 0.5 }} /> // Using generic icon for standard correction
                            )}
                            <Box width="100%">
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" textTransform="uppercase" gutterBottom>
                                    Correction
                                </Typography>

                                {error.correction.toLowerCase().includes('warning') ? (
                                    <Box
                                        sx={{
                                            mt: 1,
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.error.main, 0.1),
                                            border: `1px solid ${theme.palette.error.main}`,
                                            color: theme.palette.error.contrastText || 'error.main',
                                        }}
                                    >
                                        <Typography variant="body1" fontWeight="bold" color="error" component="div">
                                            ⚠️ {renderLinkedText(error.correction, true)}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body1" color="text.primary" component="div">
                                        {renderLinkedText(error.correction, true)}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}

                    {error.faulty_part_isolation && (
                        <Box display="flex" gap={2}>
                            <WarningIcon color="warning" sx={{ mt: 0.5 }} />
                            <Box width="100%">
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" textTransform="uppercase" gutterBottom>
                                    Fault Isolation
                                </Typography>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        bgcolor: alpha(theme.palette.background.default, 0.5),
                                        borderRadius: 1,
                                        border: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant="body2" color="text.primary" component="div">
                                        {renderLinkedText(error.faulty_part_isolation, true)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {(error.estimated_abnormal_parts || (error.parts && error.parts.length > 0)) && (
                        <Box sx={{ mt: 2, pt: 3, borderTop: `1px dashed ${theme.palette.divider}` }}>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <BuildIcon color="secondary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Recommended Spare Parts
                                </Typography>
                            </Box>

                            {error.estimated_abnormal_parts && (
                                <Box mb={3}>
                                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                                        Estimated Parts
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            bgcolor: 'background.default',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant="body2" component="div">
                                            {renderLinkedTextWithParts(error.estimated_abnormal_parts)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {error.parts && error.parts.length > 0 && (
                                <Grid container spacing={2}>
                                    {error.parts.map((part, idx) => (
                                        <Grid size={{ xs: 12, md: 6 }} key={idx}>
                                            <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'row', p: 1, alignItems: 'center', gap: 2 }}>
                                                {part.image_url && (
                                                    <Box
                                                        component="img"
                                                        src={part.image_url}
                                                        alt={part.oem_code}
                                                        sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
                                                    />
                                                )}
                                                <Box flex={1}>
                                                    <Typography variant="subtitle2" color="secondary" fontFamily="monospace" fontWeight="bold">
                                                        {part.oem_code}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                                        {part.description}
                                                    </Typography>
                                                    <Box display="flex" gap={0.5}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <Box
                                                                key={i}
                                                                sx={{
                                                                    width: 16,
                                                                    height: 4,
                                                                    borderRadius: 1,
                                                                    bgcolor: i < part.ranking ? 'secondary.main' : 'action.disabledBackground'
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}
                </Stack>
            </CardContent>

            {/* Spare Parts Search Dialog */}
            {model && (
                <SparePartsSearch
                    open={partSearchOpen}
                    onClose={() => setPartSearchOpen(false)}
                    initialQuery={partQuery}
                    model={model}
                />
            )}
        </Card>
    );
}
