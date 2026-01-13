import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    Typography,
    Box,
    Chip,
    IconButton,
    CircularProgress,
    Divider
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, Build as BuildIcon } from '@mui/icons-material';
import { searchSpareParts, type ManualSparePart } from '@/app/actions/search';
import { useDebounce } from 'use-debounce';

interface SparePartsSearchProps {
    open: boolean;
    onClose: () => void;
    initialQuery?: string;
    model: string;
}

export function SparePartsSearch({ open, onClose, initialQuery = '', model }: SparePartsSearchProps) {
    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery] = useDebounce(query, 500);
    const [results, setResults] = useState<ManualSparePart[]>([]);
    const [loading, setLoading] = useState(false);

    // Update query when initialQuery changes (e.g. reopening with a different code)
    useEffect(() => {
        if (open && initialQuery) {
            setQuery(initialQuery);
        }
    }, [open, initialQuery]);

    useEffect(() => {
        if (!model || !debouncedQuery) {
            setResults([]);
            return;
        }

        const fetchParts = async () => {
            setLoading(true);
            // Use fuzzy matching for better results
            const data = await searchSpareParts(model, debouncedQuery, true);
            setResults(data);
            setLoading(false);
        };

        fetchParts();
    }, [debouncedQuery, model]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <BuildIcon color="primary" />
                    <Typography variant="h6">Spare Parts Search ({model})</Typography>
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    autoFocus
                    margin="dense"
                    id="part-search"
                    label="Search Part Code or Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter full part code or description..."
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: loading ? <CircularProgress size={20} /> : null
                        }
                    }}
                    sx={{ mb: 2 }}
                />

                <List>
                    {results.length > 0 ? (
                        results.map((part, index) => (
                            <div key={`${part.part_code}-${index}`}>
                                <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                                    {part.part_code}
                                                </Typography>
                                                <Box display="flex" gap={0.5}>
                                                    {part.similarity && (
                                                        <Chip
                                                            label={`${Math.round(part.similarity * 100)}% match`}
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    <Chip label={`Qty: ${part.quantity}`} size="small" variant="outlined" />
                                                </Box>
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.primary" fontWeight="500">
                                                    {part.name}
                                                </Typography>
                                                <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                                                    <Chip label={`Model: ${part.model}`} size="small" sx={{ fontSize: '0.7rem' }} />
                                                    <Chip label={`Sec: ${part.section_name}`} size="small" sx={{ fontSize: '0.7rem' }} />
                                                    <Chip label={`Pg: ${part.page_number}`} size="small" sx={{ fontSize: '0.7rem' }} />
                                                    <Chip label={`Ref: ${part.ref_number}`} size="small" sx={{ fontSize: '0.7rem' }} />
                                                </Box>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {index < results.length - 1 && <Divider component="li" />}
                            </div>
                        ))
                    ) : (
                        !loading && debouncedQuery && (
                            <Box py={4} display="flex" flexDirection="column" alignItems="center">
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No parts found
                                </Typography>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    We searched for "{debouncedQuery}" in {model} and its compatible models.
                                    <br />
                                    Try entering a broader search term or checking the code.
                                </Typography>
                            </Box>
                        )
                    )}
                </List>
            </DialogContent>
        </Dialog>
    );
}
