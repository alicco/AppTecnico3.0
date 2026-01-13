'use client';

import { useState, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress, Typography, Box, Button } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { debounce } from '@mui/material/utils';

// Define Interface for Part (matching backend)
export interface Part {
    model: string;
    part_code: string;
    name: string;
    section_name: string;
    ref_number: string;
    page_number: string;
    quantity: string;
}

interface PartSearchAutocompleteProps {
    model: string;
    onSelect: (part: Part | null) => void;
    placeholder?: string;
    onQueryChange?: (query: string) => void;
    initialValue?: string;
}

export function PartSearchAutocomplete({
    model,
    onSelect,
    onQueryChange,
    onResults, // New prop
    placeholder = "Search Part Code or Name...",
    initialValue = ''
}: PartSearchAutocompleteProps & { onResults?: (parts: Part[]) => void }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<readonly Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(initialValue);

    // API Base URL
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchParts = useMemo(
        () =>
            debounce(
                async (
                    input: string,
                    currentModel: string,
                    callback: (results: Part[]) => void
                ) => {
                    if (input.length < 2) {
                        callback([]);
                        onResults?.([]); // Clear parent results
                        return;
                    }
                    try {
                        let url = `${API_BASE}/api/parts?q=${encodeURIComponent(input)}&limit=50`;
                        if (currentModel) {
                            url += `&model=${currentModel}`;
                        }

                        const res = await fetch(url);
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            callback(data);
                            onResults?.(data); // Pass list to parent
                        } else {
                            callback([]);
                            onResults?.([]);
                        }
                    } catch (error) {
                        console.error('Fetch error:', error);
                        callback([]);
                        onResults?.([]);
                    }
                },
                300
            ),
        [API_BASE, onResults],
    );

    const handleManualSearch = () => {
        if (inputValue.length < 2) return;
        setLoading(true);
        fetchParts(inputValue, model, (results) => {
            setOptions(results);
            onResults?.(results); // Pass results to parent
            setLoading(false);
            if (results.length === 0) {
                // Optional message
            }
        });
        setOpen(true);
    };

    return (
        <Box display="flex" gap={1} alignItems="center" width="100%">
            <Autocomplete
                id="part-search"
                freeSolo
                fullWidth
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => {
                    setOpen(false);
                }}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return `${option.part_code} - ${option.name}`;
                }}
                options={[] as readonly Part[]} // Disabled dropdown - only populate list below
                loading={loading}
                inputValue={inputValue}
                onInputChange={(event, newInputValue, reason) => {
                    setInputValue(newInputValue);
                    onQueryChange?.(newInputValue);

                    if (reason === 'reset') return;

                    if (newInputValue === '') {
                        setOptions([]);
                        onResults?.([]);
                        setLoading(false);
                        return;
                    }

                    // Trigger fetch/filter if >= 2 chars
                    if (newInputValue.length >= 2) {
                        setLoading(true);
                        fetchParts(newInputValue, model, (results) => {
                            setOptions(results);
                            setLoading(false);
                        });
                    }
                }}
                onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                        onSelect(newValue as Part);
                        onResults?.([newValue as Part]); // Focus on selected
                    } else {
                        onSelect(null);
                    }
                }}
                filterOptions={(x) => x}
                renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                        <li key={key} {...otherProps}>
                            <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body1" color="primary.main" fontWeight="bold">
                                        {typeof option === 'string' ? option : option.part_code}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {typeof option !== 'string' && option.section_name}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.primary" noWrap>
                                    {typeof option !== 'string' && option.name}
                                </Typography>
                            </Box>
                        </li>
                    );
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={placeholder}
                        variant="outlined"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualSearch();
                            }
                        }}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                style: { fontSize: '1.2rem', padding: '10px', minWidth: '800px' }, // Larger and wider
                                startAdornment: (
                                    <>
                                        <SearchIcon color="action" sx={{ mr: 1 }} />
                                        {params.InputProps.startAdornment}
                                    </>
                                ),
                                endAdornment: (
                                    <>
                                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                                sx: {
                                    borderRadius: 3,
                                    bgcolor: 'background.paper',
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: 2
                                    }
                                }
                            }
                        }}
                    />
                )}
            />
            <Button
                variant="contained"
                size="large"
                onClick={handleManualSearch}
                disabled={loading}
                sx={{
                    height: 56,
                    minWidth: 100,
                    borderRadius: 3,
                    background: 'linear-gradient(45deg, #FF512F 30%, #DD2476 90%)',
                    color: 'white'
                }}
            >
                Search
            </Button>
        </Box>
    );
}
