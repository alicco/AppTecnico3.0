'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Card,
    CardContent,
    Stack,
    CircularProgress,
    IconButton,
    Button,
    alpha
} from '@mui/material';
import {
    QrCodeScanner as ScannerIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Build as BuildIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { searchPartsByCode, type ManualSparePart } from '@/app/actions/search';
const colors = {
    bgDeep: '#0f172a',
    textSecondary: '#94a3b8',
    textPrimary: '#f8fafc',
    bgSurface: '#1e293b',
    bgPanel: '#0f172a',
    borderMid: '#334155',
    accentBlue: '#3b82f6',
    bgInset: '#0b1120',
    borderDark: '#1e293b',
    textMuted: '#64748b'
};

const skeuShadows = {
    raised: '0px 4px 6px -1px rgba(0, 0, 0, 0.5)',
    inset: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
    raisedHover: '0px 10px 15px -3px rgba(0, 0, 0, 0.5)',
    pressed: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.5)'
};

interface GroupedPart {
    part_code: string;
    name: string;
    models: string[];
    details: ManualSparePart[];
}

export default function ScanPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GroupedPart[]>([]);
    const [isPending, startTransition] = useTransition();
    const [scanned, setScanned] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount and keep focus (optional, but good for dedicated scanners)
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSearch = async (term: string) => {
        if (!term.trim()) return;

        startTransition(async () => {
            // Search globally
            const parts = await searchPartsByCode(term);

            // Group results by part_code
            const groups: Record<string, GroupedPart> = {};

            parts.forEach(part => {
                const code = part.part_code;
                if (!groups[code]) {
                    groups[code] = {
                        part_code: code,
                        name: part.name,
                        models: [],
                        details: []
                    };
                }
                if (!groups[code].models.includes(part.model)) {
                    groups[code].models.push(part.model);
                }
                groups[code].details.push(part);
            });

            setResults(Object.values(groups));
            setScanned(true);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
            // Optional: Select text after search to allow easy next scan
            // (e.target as HTMLInputElement).select();
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: colors.bgDeep, p: 3 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={4}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push('/')}
                    sx={{ mr: 2, color: colors.textSecondary }}
                >
                    Back
                </Button>
                <Typography variant="h4" fontWeight="800" sx={{ color: colors.textPrimary, letterSpacing: '-0.02em' }}>
                    BARCODE SCANNER
                </Typography>
            </Box>

            {/* Scanner Input Area */}
            <Box
                sx={{
                    maxWidth: 800,
                    mx: 'auto',
                    mb: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        p: 4,
                        borderRadius: 4,
                        background: `linear-gradient(145deg, ${colors.bgSurface} 0%, ${colors.bgPanel} 100%)`,
                        boxShadow: skeuShadows.raised,
                        border: `1px solid ${colors.borderMid}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                >
                    <ScannerIcon sx={{ fontSize: 64, color: colors.accentBlue, mb: 2, opacity: 0.8 }} />
                    <Typography variant="h6" color="textSecondary" mb={3}>
                        Scan a barcode or type a part number
                    </Typography>

                    <TextField
                        fullWidth
                        inputRef={inputRef}
                        placeholder="Waiting for input..."
                        value={query}
                        onChange={(e) => { setScanned(false); setQuery(e.target.value); }} // Reset scanned state on change
                        onKeyDown={handleKeyDown}
                        disabled={isPending}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                fontSize: '1.5rem',
                                bgcolor: colors.bgInset,
                                boxShadow: skeuShadows.inset,
                                borderRadius: 2,
                                '& fieldset': { border: 'none' },
                                '&.Mui-focused': {
                                    boxShadow: `0 0 0 2px ${colors.accentBlue}, ${skeuShadows.inset}`,
                                }
                            },
                            '& input': {
                                textAlign: 'center',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                letterSpacing: '0.1em'
                            }
                        }}
                        slotProps={{
                            input: {
                                endAdornment: query && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setQuery('')} edge="end">
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />

                    <Button
                        variant="contained"
                        onClick={() => handleSearch(query)}
                        disabled={isPending || !query}
                        sx={{
                            mt: 3,
                            px: 6,
                            py: 1.5,
                            borderRadius: 3,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            bgcolor: colors.accentBlue,
                            boxShadow: skeuShadows.raised,
                            '&:hover': {
                                bgcolor: alpha(colors.accentBlue, 0.8),
                                boxShadow: skeuShadows.raisedHover,
                                transform: 'translateY(-2px)'
                            },
                            '&:active': {
                                transform: 'translateY(1px)',
                                boxShadow: skeuShadows.pressed
                            }
                        }}
                    >
                        {isPending ? <CircularProgress size={24} color="inherit" /> : 'SEARCH'}
                    </Button>
                </Box>
            </Box>

            {/* Results Area */}
            <Box maxWidth={1000} mx="auto">
                {scanned && results.length === 0 && !isPending && (
                    <Box textAlign="center" p={4} sx={{ opacity: 0.7 }}>
                        <Typography variant="h5" color="textSecondary">No parts found for &quot;{query}&quot;</Typography>
                    </Box>
                )}

                {results.length > 0 && (
                    <Stack spacing={3}>
                        <Typography variant="h6" color="textSecondary" sx={{ mb: 1, ml: 1 }}>
                            FOUND {results.length} PART{results.length !== 1 ? 'S' : ''}
                        </Typography>

                        {results.map((group) => (
                            <Card
                                key={group.part_code}
                                sx={{
                                    background: `linear-gradient(180deg, ${colors.bgSurface} 0%, ${colors.bgPanel} 100%)`,
                                    borderRadius: 3,
                                    border: `1px solid ${colors.borderMid}`,
                                    boxShadow: skeuShadows.raised,
                                    overflow: 'visible' // For potential floating elements
                                }}
                            >
                                <CardContent sx={{ p: 4 }}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="flex-start">
                                        {/* Part Image / Icon */}
                                        <Box
                                            sx={{
                                                width: 100,
                                                height: 100,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: colors.bgInset,
                                                borderRadius: 3,
                                                boxShadow: skeuShadows.inset,
                                                flexShrink: 0
                                            }}
                                        >
                                            <BuildIcon sx={{ fontSize: 48, color: colors.textMuted }} />
                                        </Box>

                                        {/* Details */}
                                        <Box flex={1}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Typography
                                                        variant="h4"
                                                        fontFamily="monospace"
                                                        fontWeight="bold"
                                                        color={colors.accentBlue}
                                                        sx={{ textShadow: `0 0 10px ${colors.accentBlue}40` }}
                                                    >
                                                        {group.part_code}
                                                    </Typography>
                                                    <Typography variant="h6" color="textPrimary" fontWeight="500" mt={0.5}>
                                                        {group.name}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box mt={3}>
                                                <Typography variant="subtitle2" color="textSecondary" gutterBottom fontWeight="bold">
                                                    COMPATIBLE MODELS:
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {group.models.sort().map(model => (
                                                        <Box
                                                            key={model}
                                                            sx={{
                                                                px: 2,
                                                                py: 0.5,
                                                                borderRadius: 2,
                                                                bgcolor: colors.bgInset, // Dark/Inset look for model tags
                                                                border: `1px solid ${colors.borderDark}`,
                                                                color: colors.textPrimary,
                                                                fontWeight: 'bold',
                                                                fontSize: '0.9rem',
                                                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                                                                fontFamily: 'monospace'
                                                            }}
                                                        >
                                                            {model}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
