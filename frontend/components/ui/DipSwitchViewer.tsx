'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    TextField,
    InputAdornment,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    CircularProgress,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    FilterList as FilterIcon,
    ToggleOn as ToggleIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
} from '@mui/icons-material';

interface DipSwitch {
    id: string;
    model_name: string;
    switch_number: number;
    bit_number: number;
    function_name: string;
    setting_0: string;
    setting_1: string;
    default_val: string;
}

interface DipSwitchViewerProps {
    model: string;
    target?: { switch: number; bit?: number } | null;
    onClose: () => void;
}

export function DipSwitchViewer({ model, target, onClose }: DipSwitchViewerProps) {
    const [switches, setSwitches] = useState<DipSwitch[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSw, setFilterSw] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    // Fetch logic
    useEffect(() => {
        if (!model) return;

        // Model Aliasing (Map variants to the "Master" PDF model)
        let fetchModel = model;
        if (model === 'C6085' || model === 'C6080') fetchModel = 'C6100';
        if (model === 'C4070' || model === 'C4065') fetchModel = 'C4080'; // Logic alias as requested

        // eslint-disable-next-line
        setLoading(true);
        fetch(`http://localhost:8080/api/dipswitches?model=${encodeURIComponent(fetchModel)}`)
            .then((res) => res.json())
            .then((data) => {
                setSwitches(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch dipswitches', err);
                setLoading(false);
            });
    }, [model]);

    // Sync target to filter
    useEffect(() => {
        if (target?.switch) {
            const newFilter = target.switch.toString();
            if (filterSw !== newFilter) {
                // eslint-disable-next-line
                setFilterSw(newFilter);
            }
            if (searchQuery !== '') {
                setSearchQuery('');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    const filteredSwitches = useMemo(() => {
        return switches.filter((s) => {
            // 1. Switch Number Filter
            if (filterSw && s.switch_number.toString() !== filterSw) {
                return false;
            }

            // 2. Text Search Filter (Description, Settings)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesFunction = s.function_name?.toLowerCase().includes(query);
                const matchesSet0 = s.setting_0?.toLowerCase().includes(query);
                const matchesSet1 = s.setting_1?.toLowerCase().includes(query);
                if (!matchesFunction && !matchesSet0 && !matchesSet1) {
                    return false;
                }
            } else {
                // General browsing: Filter out "empty" or placeholder switches
                if (s.function_name === '-' || s.function_name === 'Function' || !s.function_name) {
                    return false;
                }
            }

            return true;
        });
    }, [switches, filterSw, searchQuery]);

    // Group by Switch Number
    const groupedSwitches = useMemo(() => {
        const groups: Record<number, DipSwitch[]> = {};
        filteredSwitches.forEach((sw) => {
            if (!groups[sw.switch_number]) groups[sw.switch_number] = [];
            groups[sw.switch_number].push(sw);
        });
        return groups;
    }, [filteredSwitches]);

    const handleClose = () => {
        onClose();
    };

    if (!model) return null;

    return (
        <Dialog
            open={!!model}
            onClose={handleClose}
            fullScreen={fullScreen}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                    borderRadius: fullScreen ? 0 : 3,
                    height: fullScreen ? '100%' : '90vh', // Enforce height to trigger internal scroll
                    display: 'flex',
                    flexDirection: 'column'
                },
            }}
        >
            <DialogTitle
                sx={{
                    py: 2,
                    px: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    flexShrink: 0 // Prevent shrinking
                }}
            >
                <Box display="flex" flexDirection="column">
                    <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                        <ToggleIcon color="primary" sx={{ fontSize: 32 }} />
                        <Typography variant="h5" fontWeight="bold" color="text.primary">
                            Dipsw Reference
                        </Typography>
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Configuration settings for <Box component="span" color="primary.main" fontWeight="600">{model}</Box>
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} aria-label="close" size="large">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 9 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search settings, functions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 3, bgcolor: 'background.default' }
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                                onClick={() => {
                                    const val = parseInt(filterSw) || 0;
                                    if (val > 1) setFilterSw((val - 1).toString());
                                    else setFilterSw('');
                                }}
                                color="primary"
                                sx={{ bgcolor: 'action.hover' }}
                            >
                                <RemoveIcon />
                            </IconButton>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="DipSW No."
                                type="number"
                                value={filterSw}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val < 0) return; // Prevent negative
                                    setFilterSw(e.target.value);
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FilterIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 3, bgcolor: 'background.default', textAlign: 'center' }
                                }}
                            />
                            <IconButton
                                onClick={() => {
                                    const val = parseInt(filterSw) || 0;
                                    setFilterSw((val + 1).toString());
                                }}
                                color="primary"
                                sx={{ bgcolor: 'action.hover' }}
                            >
                                <AddIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            <DialogContent dividers sx={{ bgcolor: 'background.default', p: 0 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                        <CircularProgress size={60} thickness={4} />
                    </Box>
                ) : Object.keys(groupedSwitches).length === 0 ? (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="300px" gap={2}>
                        <SearchIcon sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary">No matching switches found.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ p: 3 }}>
                        <Stack spacing={4}>
                            {Object.keys(groupedSwitches)
                                .sort((a, b) => Number(a) - Number(b))
                                .map((swNum) => (
                                    <Box key={swNum}>
                                        <Typography
                                            variant="h6"
                                            fontWeight="bold"
                                            color="primary"
                                            sx={{
                                                mb: 2,
                                                ml: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                textTransform: 'uppercase',
                                                letterSpacing: 1
                                            }}
                                        >
                                            DipSW {swNum}
                                        </Typography>

                                        <Stack spacing={2}>
                                            {groupedSwitches[Number(swNum)].map((sw) => {
                                                const isTarget = target && target.switch === sw.switch_number && target.bit === sw.bit_number;

                                                return (
                                                    <Card
                                                        key={sw.id}
                                                        elevation={isTarget ? 8 : 1}
                                                        sx={{
                                                            border: isTarget ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                                            bgcolor: isTarget ? 'rgba(41, 182, 246, 0.08)' : 'background.paper',
                                                            transition: 'all 0.2s ease-in-out',
                                                            '&:hover': {
                                                                transform: 'translateY(-2px)',
                                                                boxShadow: theme.shadows[4],
                                                            }
                                                        }}
                                                    >
                                                        <CardContent sx={{ p: '24px !important' }}>
                                                            <Grid container alignItems="center" spacing={3}>
                                                                {/* Bit Identity */}
                                                                <Grid size={{ xs: 2, sm: 1 }} display="flex" justifyContent="center">
                                                                    <Box display="flex" flexDirection="column" alignItems="center">
                                                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">BIT</Typography>
                                                                        <Chip
                                                                            label={sw.bit_number}
                                                                            color={isTarget ? "primary" : "default"}
                                                                            sx={{
                                                                                height: 32,
                                                                                width: 32,
                                                                                borderRadius: '50%',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '1rem',
                                                                                '& .MuiChip-label': { px: 0 }
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                </Grid>

                                                                {/* Function Name */}
                                                                <Grid size={{ xs: 10, sm: 5 }}>
                                                                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                                        FUNCTION
                                                                    </Typography>
                                                                    <Typography variant="body1" fontWeight="500" lineHeight={1.3}>
                                                                        {sw.function_name}
                                                                    </Typography>
                                                                </Grid>

                                                                {/* Settings */}
                                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                                    <Grid container spacing={2}>
                                                                        <Grid size={{ xs: 6 }}>
                                                                            <Box
                                                                                sx={{
                                                                                    p: 1.5,
                                                                                    bgcolor: sw.default_val === '0' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                                                    borderRadius: 2,
                                                                                    border: sw.default_val === '0' ? '1px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.05)',
                                                                                    position: 'relative'
                                                                                }}
                                                                            >
                                                                                {sw.default_val === '0' && (
                                                                                    <Chip
                                                                                        label="DEFAULT"
                                                                                        size="small"
                                                                                        color="success"
                                                                                        sx={{
                                                                                            position: 'absolute',
                                                                                            top: -10,
                                                                                            right: 10,
                                                                                            height: 20,
                                                                                            fontSize: '0.65rem',
                                                                                            fontWeight: 'bold'
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                                                    <Box width={8} height={8} borderRadius="50%" bgcolor="grey.600" />
                                                                                    <Typography variant="caption" color="text.secondary">SETTING 0</Typography>
                                                                                </Box>
                                                                                <Typography variant="body2" fontFamily="monospace" color="text.primary">
                                                                                    {sw.setting_0}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                        <Grid size={{ xs: 6 }}>
                                                                            <Box
                                                                                sx={{
                                                                                    p: 1.5,
                                                                                    bgcolor: sw.default_val === '1' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                                                    borderRadius: 2,
                                                                                    border: sw.default_val === '1' ? '1px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.05)',
                                                                                    position: 'relative'
                                                                                }}
                                                                            >
                                                                                {sw.default_val === '1' && (
                                                                                    <Chip
                                                                                        label="DEFAULT"
                                                                                        size="small"
                                                                                        color="success"
                                                                                        sx={{
                                                                                            position: 'absolute',
                                                                                            top: -10,
                                                                                            right: 10,
                                                                                            height: 20,
                                                                                            fontSize: '0.65rem',
                                                                                            fontWeight: 'bold'
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                                                    <Box width={8} height={8} borderRadius="50%" bgcolor="primary.main" />
                                                                                    <Typography variant="caption" color="text.secondary">SETTING 1</Typography>
                                                                                </Box>
                                                                                <Typography variant="body2" fontFamily="monospace" color="text.primary">
                                                                                    {sw.setting_1}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                    </Grid>
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                ))}
                        </Stack>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
