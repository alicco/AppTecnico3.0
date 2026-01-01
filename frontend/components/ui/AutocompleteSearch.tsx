'use client';

import { useState, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress, Typography, Box } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { searchErrors, type ErrorCode } from '@/app/actions/search';
import { debounce } from '@mui/material/utils';

interface AutocompleteSearchProps {
    model: string;
    onSelect: (code: string) => void;
    placeholder?: string;
    onQueryChange?: (query: string) => void;
    initialValue?: string;
}

export function AutocompleteSearch({
    model,
    onSelect,
    onQueryChange,
    placeholder = "Search Error Code...",
    initialValue = ''
}: AutocompleteSearchProps) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<readonly ErrorCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(initialValue);

    // Create a stable debounce function
    const fetchStats = useMemo(
        () =>
            debounce(
                async (
                    input: string,
                    currentModel: string,
                    callback: (results: ErrorCode[]) => void
                ) => {
                    if (!currentModel || input.length < 1) {
                        callback([]);
                        return;
                    }
                    try {
                        const results = await searchErrors(currentModel, input);
                        if (Array.isArray(results)) {
                            callback(results);
                        } else {
                            callback([]);
                        }
                    } catch (error) {
                        console.error('Fetch error:', error);
                        callback([]);
                    }
                },
                300
            ),
        [],
    );



    return (
        <Autocomplete
            id="error-code-search"
            freeSolo
            sx={{ width: '100%' }}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => {
                setOpen(false);
                setOptions([]);
            }}
            isOptionEqualToValue={(option, value) => {
                // value can be string (freeSolo) or ErrorCode object
                if (typeof value === 'string') return option.code === value;
                return option.code === value.code;
            }}
            getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.code;
            }}
            options={options}
            loading={loading}
            disabled={!model}
            inputValue={inputValue}
            onInputChange={(event, newInputValue, reason) => {
                setInputValue(newInputValue);
                onQueryChange?.(newInputValue);

                if (reason === 'reset') {
                    setOptions([]);
                    return;
                }

                if (newInputValue === '') {
                    setOptions([]);
                    setLoading(false);
                    return;
                }

                setLoading(true);
                fetchStats(newInputValue, model, (results) => {
                    setOptions(results);
                    setLoading(false);
                });
            }}
            onChange={(event, newValue) => {
                // newValue can be string (freeSolo enter) or ErrorCode object (selection)
                if (typeof newValue === 'string') {
                    onSelect(newValue);
                } else if (newValue && typeof newValue === 'object') {
                    onSelect(newValue.code);
                } else {
                    onSelect(''); // Clear
                }
            }}
            filterOptions={(x) => x} // Disable client-side filtering, we fetch from server
            renderOption={(props, option) => {
                // Destructure key from props to avoid React warning passed to DOM
                const { key, ...otherProps } = props;
                return (
                    <li key={key} {...otherProps}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Typography variant="body1" color="primary.main" fontWeight="bold">
                                {option.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '60%', ml: 2 }}>
                                {option.cause}
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
                    slotProps={{
                        input: {
                            ...params.InputProps,
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
                                borderRadius: 3, // Apply rounded corners to input base
                                bgcolor: 'background.paper', // Match existing theme
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
    );
}
